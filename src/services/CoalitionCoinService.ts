import mongoose from "mongoose";
import User from "../model/User.js";
import UserSeasonStats from "../model/coalition/UserSeasonStats.js";
import UserDailyCoinLedger from "../model/coalition/UserDailyCoinLedger.js";
import { getSeasonInfoAt, getParisDateKey } from "../utils/coalitionSeason.js";
import type { CoalitionId } from "../model/coalition/constants.js";
import { isCoalitionId } from "../model/coalition/constants.js";

/**
 * À appeler après chaque gain positif de VK Coins.
 * - Ledger journalier : tous les utilisateurs (heatmap / streak profil).
 * - Points coalition : uniquement si éligible et phase guerre.
 */
export async function recordCoinGain(
  userId: mongoose.Types.ObjectId | string,
  amount: number,
  at: Date = new Date()
): Promise<void> {
  if (!amount || amount <= 0 || !Number.isFinite(amount)) return;

  const uid =
    typeof userId === "string"
      ? new mongoose.Types.ObjectId(userId)
      : userId;

  const dateKey = getParisDateKey(at);
  await UserDailyCoinLedger.updateOne(
    { user: uid, dateKey },
    { $inc: { coinsEarned: amount } },
    { upsert: true }
  );

  const user = await User.findById(uid)
    .select("discordAccess discordId coalitionOptOut coalitionId")
    .lean();
  if (!user) return;
  if (!user.discordAccess || !user.discordId || user.coalitionOptOut) return;
  const cid = user.coalitionId;
  if (!cid || !isCoalitionId(cid)) return;

  const season = await getSeasonInfoAt(at);
  if (!season || season.phase !== "war") return;

  await UserSeasonStats.updateOne(
    { user: uid, seasonKey: season.seasonKey },
    {
      $set: { coalitionId: cid as CoalitionId },
      $inc: { points: amount },
    },
    { upsert: true }
  );
}
