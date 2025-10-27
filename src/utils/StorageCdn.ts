import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import CST from '../server/constants.js';
import Resource from "../model/Resource.js";
import * as path from "node:path";
import * as fs from "node:fs";
import ffmpeg, {FfprobeData} from "fluent-ffmpeg";
import * as https from "node:https";
import * as ftp from "basic-ftp";

dotenv.config();

interface IStreamResponse {
    bunnyFilePath: string;
    duration: number;
}

class StorageCdn {

    private readonly storageZoneName: string;
    private readonly accessKey: string;
    private readonly accessKeyStream: string;
    private readonly libsID: string;
    private readonly ftpPassword: string;
    private readonly cdnUrl: string;
    private readonly securityKey: string | undefined;
    private readonly tokenExpiration: number;

    constructor() {
        this.storageZoneName = CST.STORAGE.BUNNY_STORAGE_NAME!;
        this.accessKey = CST.STORAGE.BUNNY_ACCESS_KEY!;
        this.accessKeyStream = CST.STORAGE.BUNNY_STREAM_ACCESS_KEY!;
        this.cdnUrl = CST.STORAGE.BUNNY_CDN_URL!;
        this.ftpPassword = CST.STORAGE.BUNNY_FTP_PASSWORD!;
        this.securityKey = CST.STORAGE.BUNNY_SECURITY_KEY;
        this.libsID = CST.STORAGE.BUNNY_LIBS_ID!;

        // @ts-ignore
        this.tokenExpiration = parseInt(CST.STORAGE.TOKEN_EXPIRATION);
        if (!this.tokenExpiration || !this.securityKey || !this.storageZoneName || !this.accessKey || !this.cdnUrl) {
            throw new Error("missing in .env");
        }
    }

    /**
     * Upload de fichier sur BunnyCDN
     * @param path path du fichier
     * @param destinationPath Chemin où enregistrer le fichier sur BunnyCDN
     * @param originalName Nom original du fichier
     * @param isVideo Indique si le fichier est une vidéo
     */
    async uploadFile(path: string, destinationPath: string, originalName: string, isVideo: boolean): Promise<IStreamResponse> {
        try {
            let findResource = await Resource.findOne({ originalName: originalName }).lean();
            if (findResource) {
                console.log(`Fichier déjà présent sur BunnyCDN : ${destinationPath}`);
                return {bunnyFilePath: findResource.pathFile, duration: findResource.duration ? findResource.duration : 0};
            }
            let duration: number = await new Promise<number>((resolve, reject) => {
                if (!path || !isVideo) {
                    resolve(0);
                } else {
                    ffmpeg.ffprobe(path, (err: any, metadata: FfprobeData) => {
                        if (err) {
                            console.error(err);
                            resolve(0);
                        } else {
                            // @ts-ignore
                            resolve(metadata.format.duration);
                        }
                    });
                }
            });
            const client = new ftp.Client();
            client.ftp.verbose = false;

            await client.access({
                host: "storage.bunnycdn.com",
                user: "valek",
                password: this.ftpPassword,
                secure: false,
            });

            await client.uploadFrom(path, destinationPath);
            client.close();
            await Resource.create({
                pathFile: destinationPath,
                video: isVideo,
                duration,
                originalName,
            });

            return {bunnyFilePath: destinationPath, duration: duration};
        } catch (error: Error | any) {
            console.error(`Erreur upload BunnyCDN:`, error.response?.data || error.message);
            throw new Error("Upload vers BunnyCDN échoué");
        }
    }

    /**
     * Upload de fichier sur BunnyCDN
     * @param path path du fichier
     * @param originalName Nom original du fichier
     */
    async uploadVideoFile(
        path: string,
        originalName: string,
        options?: { detached?: boolean; persist?: boolean }
    ) {
        const detached = options?.detached !== false;
        const persist  = options?.persist  !== false;

        const httpsAgent = new https.Agent({
            keepAlive: false,
            minVersion: "TLSv1.2",
            maxVersion: "TLSv1.3",
        });

        const createRes = await axios.post(
            `https://video.bunnycdn.com/library/${this.libsID}/videos`,
            { title: originalName },
            {
                headers: {
                    AccessKey: this.accessKeyStream,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                timeout: 0,
                proxy: false,
            }
        );

        const videoGuid = createRes.data?.guid;
        if (!videoGuid) throw new Error("Erreur lors de la création de la vidéo (guid manquant)");

        const doUpload = async () => {
            const duration: number = await new Promise<number>((resolve) => {
                ffmpeg.ffprobe(path, (err: any, metadata: FfprobeData) => {
                    if (err) return resolve(0);
                    // @ts-ignore
                    resolve(Number(metadata?.format?.duration || 0));
                });
            });

            const { size } = fs.statSync(path);
            const putUrl = `https://video.bunnycdn.com/library/${this.libsID}/videos/${videoGuid}`;
            const stream = fs.createReadStream(path);

            await axios.put(putUrl, stream, {
                headers: {
                    AccessKey: this.accessKeyStream,
                    "Content-Type": "application/octet-stream",
                    "Content-Length": size,
                    Accept: "application/json",
                },
                httpsAgent,
                proxy: false,
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                decompress: false,
                timeout: 0,
                validateStatus: (s) => s >= 200 && s < 300,
            });

            if (persist) {
                await Resource.create({
                    pathFile: videoGuid,
                    video: true,
                    duration,
                    originalName,
                });
            }

            console.log(`✅ Upload Bunny terminé pour ${originalName} (${videoGuid})`);
            return { bunnyFilePath: videoGuid, duration };
        };

        if (detached) {
            setImmediate(() => {
                doUpload().catch((e) => {
                    console.error("❌ Upload BunnyCDN en arrière-plan échoué:", {
                        message: e?.message,
                        code: e?.code,
                        status: e?.response?.status,
                        data:
                            typeof e?.response?.data === "string"
                                ? e.response.data.slice(0, 1000)
                                : e?.response?.data,
                    });
                });
            });

            return { bunnyFilePath: videoGuid, duration: 0 };
        }

        try {
            return await doUpload();
        } catch (error: any) {
            console.error("Erreur upload BunnyCDN (détails):", {
                message: error?.message,
                code: error?.code,
                status: error?.response?.status,
                headers: error?.response?.headers,
                data:
                    typeof error?.response?.data === "string"
                        ? error.response.data.slice(0, 1000)
                        : error?.response?.data,
            });
            throw new Error("Upload vers BunnyCDN échoué");
        }
    }
    /**
     * Upload de fichier sur BunnyCDN
     * @param path path du fichier
     * @param destinationPath Chemin où enregistrer le fichier sur BunnyCDN
     * @param originalName Nom original du fichier
     */
    async uploadEvaluationFile(path: string, destinationPath: string, originalName: string): Promise<IStreamResponse> {
        try {
            const url = `https://storage.bunnycdn.com/${this.storageZoneName}/${destinationPath}`;
            const fileBuffer = fs.readFileSync(path);

            await axios.put(url, fileBuffer, {
                headers: {
                    AccessKey: this.accessKey,
                    'Content-Type': 'application/octet-stream',
                },
            });
            await Resource.create({
                pathFile: destinationPath,
                video: false,
                duration: 0,
                originalName,
            });

            return {bunnyFilePath: destinationPath, duration: 0};
        } catch (error: Error | any) {
            console.error("Erreur upload BunnyCDN:", error.response?.data || error.message);
            throw new Error("Upload vers BunnyCDN échoué");
        }
    }


    async deleteEvaluationFile(path: string): Promise<boolean> {
        try {
            const url = `https://storage.bunnycdn.com/${this.storageZoneName}/${path}`;
            console.log(url);
            await axios.delete(url, {
                headers: {
                    AccessKey: this.accessKey
                },
            });

            return true;
        } catch (error: Error | any) {
            console.error(`Erreur upload BunnyCDN:`, error.response?.data || error.message);
            throw new Error("Upload vers BunnyCDN échoué");
        }
    }


    /**
     * Genere un lien sécurisé pour accéder à un fichier sur BunnyCDN
     * @param filePath Chemin du fichier sur BunnyCDN
     * @returns URL sécurisée du fichier
     */
    generateSecureLink(filePath: string): string {
        const expiration = Math.floor(Date.now() / 1000) + this.tokenExpiration;
        const path = `/${filePath}`;
        // @ts-ignore
        let hash = Buffer.from(crypto.createHash('sha256').update(this.securityKey)
            .update(`${path}${expiration}`)
            .digest()).toString('base64');
        hash =  hash.replace(/\n/g, "").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");


        return `${this.cdnUrl}${path}?token=${hash}&expires=${expiration}`;
    }

    /**
     * Récupère un stream de fichier depuis BunnyCDN
     * @param filePath Chemin du fichier sur BunnyCDN
     * @param rangeHeader Header "Range" de la requête HTTP
     * @returns Objet contenant le stream et les headers nécessaires
     */
    async getStream(filePath: string, rangeHeader?: string) {
        try {
            const secureUrl = this.generateSecureLink(filePath);
            const headResponse = await axios.head(secureUrl);
            const fileSize = parseInt(headResponse.headers['content-length'], 10);

            if (isNaN(fileSize) || fileSize <= 0) {
                throw new Error("Taille du fichier invalide");
            }

            const maxAllowedSize = Math.floor(fileSize * 0.2); // Limite à 20% de la vidéo
            let headers: any = {
                'Content-Type': 'video/mp4',
                'Accept-Ranges': 'bytes',
            };

            if (!rangeHeader || rangeHeader === "bytes=0-" || rangeHeader === "bytes=0-1") {
                rangeHeader = `bytes=0-${maxAllowedSize - 1}`;
            }

            const [startStr, endStr] = rangeHeader.replace(/bytes=/, "").split("-");
            const start = parseInt(startStr, 10);
            let end = endStr ? parseInt(endStr, 10) : start + maxAllowedSize - 1;

            if (isNaN(start) || start < 0 || start >= fileSize) {
                throw new Error("Plage de début invalide");
            }

            // Empêcher de dépasser 20% de la vidéo
            if (end - start + 1 > maxAllowedSize) {
                throw new Error("La plage demandée dépasse la limite autorisée (20% du fichier)");
            }

            end = Math.min(end, fileSize - 1);
            const chunkSize = (end - start) + 1;

            const response = await axios.get(secureUrl, {
                headers: { Range: `bytes=${start}-${end}` },
                responseType: 'stream',
            });

            headers = {
                ...headers,
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Content-Length': chunkSize,
            };

            return { stream: response.data, headers };

        } catch (error: any) {
            throw new Error(`Erreur lors du streaming du fichier: ${error.message}`);
        }
    }



    /**
     * Génère un nom de fichier aléatoire en conservant son extension
     * @param originalName Nom du fichier d'origine (ex: "mdr.mp4")
     * @returns Nom du fichier aléatoire (ex: "a1b2c3d4e5f6.mp4")
     */
    async generateRandomFilename(originalName: string): Promise<string> {
        const ext = path.extname(originalName);
        const randomName = crypto.randomBytes(16).toString('hex');
        return `${randomName}${ext}`;
    }
}

export default new StorageCdn();
