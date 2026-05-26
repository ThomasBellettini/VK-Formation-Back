import mongoose from "mongoose";
import Notification from "../model/Notification.js";
import User from "../model/User.js";
import UserSeasonStats from "../model/coalition/UserSeasonStats.js";
import CoalitionSeason from "../model/coalition/CoalitionSeason.js";
import CoalitionVote from "../model/coalition/CoalitionVote.js";
import CoalitionCandidacy from "../model/coalition/CoalitionCandidacy.js";
import SeasonResult from "../model/coalition/SeasonResult.js";
import {
  COALITION_IDS,
  type CoalitionId,
} from "../model/coalition/constants.js";
import {
  ensureCurrentAndNextSeasonDocs,
  getParisDateKey,
  requireSeasonInfoAt,
} from "./coalitionSeason.js";

export async function recalculateLeaderboardRanks(seasonKey: string) {
  const rows = await UserSeasonStats.find({ seasonKey })
    .sort({ points: -1 })
    .select("_id")
    .lean();
  let rank = 1;
  for (const r of rows) {
    await UserSeasonStats.updateOne(
      { _id: r._id },
      { $set: { globalRank: rank++ } }
    );
  }
}

async function pickElectedLeader(
  seasonKey: string,
  coalitionId: CoalitionId
): Promise<string | null> {
  const tallies = await CoalitionVote.aggregate([
    { $match: { seasonKey, coalitionId } },
    { $group: { _id: "$candidate", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  if (!tallies.length) return null;
  const max = tallies[0].count;
  const topIds = tallies.filter((t) => t.count === max).map((t) => t._id);

  if (topIds.length === 1) return topIds[0]!.toString();

  const cands = await CoalitionCandidacy.find({
    seasonKey,
    coalitionId,
    user: { $in: topIds },
  })
    .sort({ createdAt: 1 })
    .limit(1)
    .lean();
  return cands[0]?.user?.toString() ?? null;
}

async function finalizeOneSeason(seasonKey: string): Promise<void> {
  const [yStr, idxStr] = seasonKey.split("-");
  const year = Number(yStr);
  const seasonIndex = Number(idxStr) as 1 | 2 | 3 | 4;

  const coalitionTotals: Record<CoalitionId, number> = {
    orion: 0,
    noctis: 0,
    pulse: 0,
  };
  for (const cid of COALITION_IDS) {
    const agg = await UserSeasonStats.aggregate([
      { $match: { seasonKey, coalitionId: cid } },
      { $group: { _id: null, t: { $sum: "$points" } } },
    ]);
    coalitionTotals[cid] = agg[0]?.t ?? 0;
  }

  const sorted = [...COALITION_IDS].sort(
    (a, b) =>
      coalitionTotals[b] - coalitionTotals[a] || a.localeCompare(b)
  );
  const winningCoalitionId: CoalitionId | null = sorted[0] ?? null;

  const electedLeaders: Record<string, mongoose.Types.ObjectId> = {};
  for (const cid of COALITION_IDS) {
    const uid = await pickElectedLeader(seasonKey, cid);
    if (uid) electedLeaders[cid] = new mongoose.Types.ObjectId(uid);
  }

  const participants = await UserSeasonStats.distinct("user", {
    seasonKey,
  });

  await SeasonResult.create({
    seasonKey,
    year,
    seasonIndex,
    coalitionTotals,
    winningCoalitionId,
    electedLeaders,
    participantCount: participants.length,
  });

  await CoalitionSeason.updateOne(
    { seasonKey },
    {
      $set: {
        archivedAt: new Date(),
      },
    }
  );
}

export async function finalizeSeasonIfNeeded(): Promise<void> {
  const todayKey = getParisDateKey();
  const done = await SeasonResult.distinct("seasonKey", {});
  const doneSet = new Set(done);

  const backlog = await CoalitionSeason.find({
    warEndDateKey: { $lt: todayKey },
    archivedAt: { $exists: false },
    seasonKey: { $nin: Array.from(doneSet) },
    warStartDateKey: { $exists: true },
  })
    .sort({ seasonKey: 1 })
    .lean();

  for (const row of backlog) {
    const exists = await SeasonResult.findOne({ seasonKey: row.seasonKey });
    if (exists) continue;
    await finalizeOneSeason(row.seasonKey);
  }
}

async function notifyCoalitionMembers(title: string, description: string) {
  const users = await User.find({
    discordAccess: true,
    coalitionOptOut: { $ne: true },
    coalitionId: { $in: [...COALITION_IDS] },
  })
    .select("_id")
    .lean();

  const docs = users.map((u) => ({
    title,
    description,
    linkedUser: u._id,
  }));
  if (docs.length) await Notification.insertMany(docs);
}

export async function runVoteNotifications(): Promise<void> {
  const key = getParisDateKey();

  const startSeason = await CoalitionSeason.findOne({
    archivedAt: { $exists: false },
    voteStartDateKey: key,
  }).lean();

  if (startSeason) {
    await notifyCoalitionMembers(
      "Vote chef de coalition",
      "La période de vote pour élire votre chef de coalition a commencé."
    );
  }

  const endSeason = await CoalitionSeason.findOne({
    archivedAt: { $exists: false },
    voteEndDateKey: key,
  }).lean();

  if (endSeason) {
    await notifyCoalitionMembers(
      "Fin du vote",
      "La période de vote pour le chef de coalition se termine ce soir."
    );
  }
}

export async function runDailyCoalitionJobs(): Promise<void> {
  await ensureCurrentAndNextSeasonDocs(new Date());
  await finalizeSeasonIfNeeded();
  const season = await requireSeasonInfoAt();
  await recalculateLeaderboardRanks(season.seasonKey);
  await runVoteNotifications();
}
