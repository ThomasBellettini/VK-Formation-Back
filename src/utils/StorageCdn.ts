import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import CST from '../server/constants.js';
import Resource from "../model/Resource.js";
import * as path from "node:path";

dotenv.config();

class StorageCdn {

    private readonly storageZoneName: string;
    private readonly accessKey: string;
    private readonly cdnUrl: string;
    private readonly securityKey: string | undefined;
    private readonly tokenExpiration: number;

    constructor() {
        this.storageZoneName = CST.STORAGE.BUNNY_STORAGE_NAME!;
        this.accessKey = CST.STORAGE.BUNNY_ACCESS_KEY!;
        this.cdnUrl = CST.STORAGE.BUNNY_CDN_URL!;
        this.securityKey = CST.STORAGE.BUNNY_SECURITY_KEY;
        // @ts-ignore
        this.tokenExpiration = parseInt(CST.STORAGE.TOKEN_EXPIRATION);
        if (!this.tokenExpiration || !this.securityKey || !this.storageZoneName || !this.accessKey || !this.cdnUrl) {
            throw new Error("missing in .env");
        }
    }

    /**
     * Upload de fichier sur BunnyCDN
     * @param fileBuffer Contenu du fichier en buffer
     * @param destinationPath Chemin où enregistrer le fichier sur BunnyCDN
     * @param originalName Nom original du fichier
     * @param isVideo Indique si le fichier est une vidéo
     */
    async uploadFile(fileBuffer: Buffer, destinationPath: string, originalName: string, isVideo: boolean): Promise<string> {
        try {
            let findResource = await Resource.findOne({ originalName: originalName }).lean();
            if (findResource) {
                console.log(`Fichier déjà présent sur BunnyCDN : ${destinationPath}`);
                return findResource.pathFile;
            }
            const url = `https://storage.bunnycdn.com/${this.storageZoneName}/${destinationPath}`;

            await axios.put(url, fileBuffer, {
                headers: {
                    AccessKey: this.accessKey,
                    'Content-Type': 'application/octet-stream',
                },
            });
            await Resource.create({
                pathFile: destinationPath,
                video: isVideo,
                originalName,
            });

            return destinationPath;
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

            let headers: any = {
                'Content-Type': 'video/mp4',
                'Accept-Ranges': 'bytes',
            };

            if (!rangeHeader || rangeHeader === "bytes=0-") {
                rangeHeader = "bytes=0-999999";
            }

            const [startStr, endStr] = rangeHeader.replace(/bytes=/, "").split("-");
            const start = parseInt(startStr, 10);
            let end = endStr ? parseInt(endStr, 10) : start + 999999; // 🔥 Limite à 1 Mo max

            if (isNaN(start) || start < 0 || start >= fileSize) {
                throw new Error("Invalid start range");
            }

            end = Math.min(start + 999999, fileSize - 1);
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
