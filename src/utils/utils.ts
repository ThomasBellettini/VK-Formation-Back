import User, { IUser } from '../model/User.js';
import { IPolaris } from '../model/learning/Polaris.js';
import { IPlanet } from '../model/learning/Planet.js';
import Polaris from '../model/learning/Polaris.js';
import Planet from '../model/learning/Planet.js';

function dateFormat(timestamp: number) {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
}

function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const formattedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;
    return minutes + ":" + formattedSeconds;
}

/**
 * Calcule le niveau d'un utilisateur pour un Polaris donné
 * @param user L'utilisateur pour lequel calculer le niveau
 * @param polarisIdentifier L'identifiant du Polaris
 * @returns Le niveau de l'utilisateur pour ce Polaris (0 si aucune planète terminée)
 */
async function getUserLevelForPolaris(
    user: IUser,
    polarisIdentifier: string
): Promise<number> {
    const polaris = await Polaris.findOne({ identifier: polarisIdentifier })
        .populate({
            path: "planets",
            model: "Planet",
            select: "_id level name",
        })
        .lean();

    if (!polaris) {
        throw new Error(`Polaris avec l'identifiant ${polarisIdentifier} non trouvé`);
    }

    // Map level -> planets[]
    const planetsByLevel = new Map<number, IPlanet[]>();
    for (const planet of (polaris.planets as IPlanet[]) || []) {
        const lvl = planet.level;
        if (!planetsByLevel.has(lvl)) planetsByLevel.set(lvl, []);
        planetsByLevel.get(lvl)!.push(planet);
    }

    // Normaliser l’ID des planètes finies côté user
    const userFinishedPlanetIds = (user.planetsFinished || []).map((p: any) =>
        typeof p === "string" ? p : (p?._id ?? p).toString()
    );

    let maxLevel = 1; // mets 0 si tu préfères
    const sortedLevels = Array.from(planetsByLevel.keys()).sort((a, b) => a - b);

    for (const level of sortedLevels) {
        const planetsInLevel = planetsByLevel.get(level)!;
        if (planetsInLevel.length === 0) continue;

        const allPlanetsInLevelFinished = planetsInLevel.every((planet) =>
            userFinishedPlanetIds.includes(planet._id.toString())
        );

        if (allPlanetsInLevelFinished) {
            maxLevel = level + 1;
        } else {
            break;
        }
    }

    return maxLevel;
}

export {dateFormat, formatTime, getUserLevelForPolaris};