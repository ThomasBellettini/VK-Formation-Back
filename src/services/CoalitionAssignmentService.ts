import axios from "axios";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import User, { IUser } from "../model/User.js";
import UserSeasonStats from "../model/coalition/UserSeasonStats.js";
import {
  COALITION_IDS,
  type CoalitionId,
  isCoalitionId,
} from "../model/coalition/constants.js";
import CST from "../server/constants.js";
import { requireSeasonInfoAt } from "../utils/coalitionSeason.js";

/**
 * Synchronise les rôles coalition via le **module Discord** (même principe que
 * `DiscordServices` / `Cron` : `CST.DISCORD.API_URL`), connecté au bot.
 */
export async function syncDiscordCoalitionRoles(
  discordUserId: string,
  coalitionId: CoalitionId | null
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const base = CST.DISCORD.API_URL;
  if (!base) {
    return { ok: false, skipped: "DISCORD_MODULE_URL non configuré" };
  }

  try {
    const { data, status } = await axios.post(
      `${base.replace(/\/$/, "")}/discord/coalition/sync`,
      { discordId: discordUserId, coalitionId },
      {
        headers: {
          "Content-Type": "application/json",
          ...(process.env.API_KEY
            ? { "X-VK-TOKEN": process.env.API_KEY }
            : {}),
        },
        timeout: 30_000,
        validateStatus: () => true,
      }
    );

    if (status >= 200 && status < 300 && data && (data as { ok?: boolean }).ok) {
      return { ok: true };
    }
    const msg =
      (data as { error?: string; message?: string })?.error ??
      (data as { message?: string })?.message ??
      (typeof data === "string" ? data : JSON.stringify(data));
    return { ok: false, error: msg || `HTTP ${status}` };
  } catch (e: any) {
    console.error("syncDiscordCoalitionRoles:", e?.response?.data ?? e?.message);
    return {
      ok: false,
      error: e?.response?.data?.error ?? e?.message ?? "Network error",
    };
  }
}

export async function pickBalancedCoalition(): Promise<CoalitionId> {
  const counts = await Promise.all(
    COALITION_IDS.map((id) =>
      User.countDocuments({
        coalitionId: id,
        coalitionOptOut: { $ne: true },
      })
    )
  );
  const min = Math.min(...counts);
  const candidates = COALITION_IDS.filter((_, i) => counts[i] === min);
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

export function ensurePublicSlug(user: IUser): string {
  if (user.publicSlug && user.publicSlug.length > 0) return user.publicSlug;
  const slug = `vk-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  user.publicSlug = slug;
  return slug;
}

export async function ensurePublicSlugForUser(
  userId: mongoose.Types.ObjectId | string
): Promise<string | null> {
  const uid =
    typeof userId === "string"
      ? new mongoose.Types.ObjectId(userId)
      : userId;
  const user = await User.findById(uid);
  if (!user) return null;

  const slug = ensurePublicSlug(user);
  if (user.isModified("publicSlug")) {
    await user.save();
  }

  return slug;
}

export function hasLinkedDiscordAccount(
  user: Pick<IUser, "discordId"> | null | undefined
): boolean {
  return typeof user?.discordId === "string" && user.discordId.trim().length > 0;
}

async function clearCoalitionForIneligibleUser(user: IUser): Promise<void> {
  const hadCoalition = Boolean(user.coalitionId);
  if (!hadCoalition) return;
  const season = await requireSeasonInfoAt();

  user.coalitionId = null;
  await user.save();
  await UserSeasonStats.deleteMany({
    user: user._id,
    seasonKey: season.seasonKey,
  });

  if (hasLinkedDiscordAccount(user)) {
    await syncDiscordCoalitionRoles(user.discordId, null);
  }
}

/**
 * Assigne une coalition si l'utilisateur a accès Discord, n'est pas exclu, et n'a pas encore de coalition.
 * Si déjà assigné, synchronise les rôles Discord lorsque `discordId` est présent.
 */
export async function assignCoalitionForEligibleUser(
  userId: mongoose.Types.ObjectId | string
): Promise<void> {
  const uid =
    typeof userId === "string"
      ? new mongoose.Types.ObjectId(userId)
      : userId;
  const user = await User.findById(uid);
  if (!user) return;
  if (!user.discordAccess || !hasLinkedDiscordAccount(user) || user.coalitionOptOut) {
    await clearCoalitionForIneligibleUser(user);
    return;
  }

  if (!user.coalitionId || !isCoalitionId(user.coalitionId)) {
    user.coalitionId = await pickBalancedCoalition();
  }
  ensurePublicSlug(user);
  await user.save();

  if (user.discordId && user.coalitionId && isCoalitionId(user.coalitionId)) {
    await syncDiscordCoalitionRoles(user.discordId, user.coalitionId);
  }
}
