import { Request } from "express";
import User, { IUser } from "../model/User.js";
import UserSeasonStats from "../model/coalition/UserSeasonStats.js";
import CoalitionCandidacy from "../model/coalition/CoalitionCandidacy.js";
import CoalitionVote from "../model/coalition/CoalitionVote.js";
import SeasonResult from "../model/coalition/SeasonResult.js";
import UserDailyCoinLedger from "../model/coalition/UserDailyCoinLedger.js";
import {
  COALITION_IDS,
  type CoalitionId,
  isCoalitionId,
} from "../model/coalition/constants.js";
import {
  getSeasonInfoAt,
  getParisDateKey,
  requireSeasonInfoAt,
} from "../utils/coalitionSeason.js";
import {
  assignCoalitionForEligibleUser,
  ensurePublicSlugForUser,
  hasLinkedDiscordAccount,
  syncDiscordCoalitionRoles,
} from "./CoalitionAssignmentService.js";

function isActiveCoalitionMember(
  user:
    | Pick<IUser, "discordAccess" | "discordId" | "coalitionOptOut" | "coalitionId">
    | null
    | undefined
): user is Pick<
  IUser,
  "discordAccess" | "discordId" | "coalitionOptOut" | "coalitionId"
> & { coalitionId: CoalitionId } {
  return Boolean(
    user &&
      user.discordAccess &&
      hasLinkedDiscordAccount(user) &&
      !user.coalitionOptOut &&
      user.coalitionId &&
      isCoalitionId(user.coalitionId)
  );
}

async function pickElectedLeaderForSeason(
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

async function resolveDisplayedLeaders(
  seasonKey: string,
  phase: "vote" | "war",
  lastResult: any
): Promise<Partial<Record<CoalitionId, unknown>>> {
  if (phase !== "war") {
    return {};
  }

  const leaders: Partial<Record<CoalitionId, unknown>> = {};

  for (const cid of COALITION_IDS) {
    let uid: string | null = null;
    uid = await pickElectedLeaderForSeason(seasonKey, cid);

    if (!uid) continue;

    const u = await User.findById(uid)
      .select("discordUsername discordAvatar coalitionId")
      .lean();
    if (u) leaders[cid] = u;
  }

  return leaders;
}

async function hydrateSeasonResultLeaders<T extends {
  electedLeaders?: Partial<Record<CoalitionId, any>>;
}>(season: T): Promise<T> {
  const rawLeaders = season.electedLeaders ?? {};
  const ids = Object.values(rawLeaders)
    .map((value) => value?.toString?.() ?? null)
    .filter((value): value is string => Boolean(value));

  if (!ids.length) return season;

  const users = await User.find({ _id: { $in: ids } })
    .select("discordUsername discordAvatar coalitionId")
    .lean();

  const byId = new Map(users.map((user) => [user._id.toString(), user]));
  const electedLeaders = Object.fromEntries(
    Object.entries(rawLeaders).map(([coalitionId, value]) => {
      const leader = value ? byId.get(value.toString()) ?? null : null;
      return [coalitionId, leader];
    })
  ) as T["electedLeaders"];

  return {
    ...season,
    electedLeaders,
  };
}

function getCurrentParisWeekStartKey(at: Date = new Date()): string {
  const todayKey = getParisDateKey(at);
  const [yStr, mStr, dStr] = todayKey.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const utcMidday = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = utcMidday.getUTCDay();
  const mondayOffset = (dayOfWeek + 6) % 7;
  utcMidday.setUTCDate(utcMidday.getUTCDate() - mondayOffset);
  return `${utcMidday.getUTCFullYear()}-${String(
    utcMidday.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(utcMidday.getUTCDate()).padStart(2, "0")}`;
}

class CoalitionServices {
  constructor() {
    this.getOverview = this.getOverview.bind(this);
    this.submitCandidacy = this.submitCandidacy.bind(this);
    this.castVote = this.castVote.bind(this);
    this.listCandidates = this.listCandidates.bind(this);
    this.getLeaderboard = this.getLeaderboard.bind(this);
    this.getHistory = this.getHistory.bind(this);
    this.getSeasonByKey = this.getSeasonByKey.bind(this);
    this.getPublicProfile = this.getPublicProfile.bind(this);
    this.adminRemoveCoalition = this.adminRemoveCoalition.bind(this);
    this.adminAddCoalitionPoints = this.adminAddCoalitionPoints.bind(this);
    this.adminExcludeFromSystem = this.adminExcludeFromSystem.bind(this);
  }

  async getOverview(_req: Request) {
    try {
      const season = await requireSeasonInfoAt();
      const coalitionTotals: Record<string, number> = {};
      for (const cid of COALITION_IDS) {
        const agg = await UserSeasonStats.aggregate([
          { $match: { seasonKey: season.seasonKey, coalitionId: cid } },
          { $group: { _id: null, t: { $sum: "$points" } } },
        ]);
        coalitionTotals[cid] = agg[0]?.t ?? 0;
      }

      const lastResult = await SeasonResult.findOne()
        .sort({ seasonKey: -1 })
        .lean();

      const leaders = await resolveDisplayedLeaders(
        season.seasonKey,
        season.phase,
        lastResult
      );

      const topByCoalition: Record<string, unknown[]> = {};
      const topWeeklyByCoalition: Record<string, unknown[]> = {};
      const weekStartDateKey = getCurrentParisWeekStartKey();
      const todayDateKey = getParisDateKey();
      const weeklyWarStartDateKey =
        weekStartDateKey > season.warStartDateKey
          ? weekStartDateKey
          : season.warStartDateKey;
      for (const cid of COALITION_IDS) {
        const rows = await UserSeasonStats.find({
          seasonKey: season.seasonKey,
          coalitionId: cid,
        })
          .sort({ points: -1 })
          .limit(5)
          .populate("user", "discordUsername discordAvatar coalitionId")
          .lean();
        topByCoalition[cid] = rows;

        const weeklyRows = await UserDailyCoinLedger.aggregate([
          {
            $match: {
              dateKey: { $gte: weeklyWarStartDateKey, $lte: todayDateKey },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: "$user" },
          {
            $match: {
              "user.coalitionId": cid,
              "user.coalitionOptOut": { $ne: true },
            },
          },
          {
            $group: {
              _id: "$user._id",
              points: { $sum: "$coinsEarned" },
              user: {
                $first: {
                  _id: "$user._id",
                  discordUsername: "$user.discordUsername",
                  discordAvatar: "$user.discordAvatar",
                  coalitionId: "$user.coalitionId",
                },
              },
            },
          },
          { $sort: { points: -1, _id: 1 } },
          { $limit: 5 },
        ]);
        topWeeklyByCoalition[cid] = weeklyRows;
      }

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          season,
          coalitionTotals,
          topMembersByCoalition: topByCoalition,
          topWeeklyMembersByCoalition: topWeeklyByCoalition,
          lastSeasonResult: lastResult,
          currentLeadersFromLastSeason: leaders,
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: { message: "Error" },
      };
    }
  }

  async submitCandidacy(req: Request) {
    try {
      // @ts-ignore
      const auth = req.user as IUser;
      const presentation = String(req.body?.presentation ?? "").trim();
      if (!presentation || presentation.length < 10) {
        throw new Error("Présentation trop courte (min. 10 caractères).");
      }
      const season = await requireSeasonInfoAt();
      if (season.phase !== "vote") {
        throw new Error("Les candidatures ne sont ouvertes que pendant la période de vote.");
      }
      const user = await User.findOne({ email: auth.email });
      if (!user) throw new Error("Utilisateur introuvable.");

      await assignCoalitionForEligibleUser(user._id);

      const refreshedUser = await User.findById(user._id).select(
        "discordAccess discordId coalitionOptOut coalitionId"
      );
      if (!isActiveCoalitionMember(refreshedUser)) {
        throw new Error(
          "Votre compte doit etre relie a Discord pour participer aux coalitions."
        );
      }

      await CoalitionVote.findOneAndDelete({
        voter: user._id,
        seasonKey: season.seasonKey,
      });

      await CoalitionCandidacy.findOneAndUpdate(
        { user: user._id, seasonKey: season.seasonKey },
        {
          $set: { presentation, coalitionId: refreshedUser.coalitionId },
          $setOnInsert: {
            user: user._id,
            seasonKey: season.seasonKey,
          },
        },
        { upsert: true, new: true }
      );

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: { message: "Candidature enregistrée." },
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: { message: err.message ?? "Error" },
      };
    }
  }

  async castVote(req: Request) {
    try {
      // @ts-ignore
      const auth = req.user as IUser;
      const candidateId = req.body?.candidateId;
      if (!candidateId) throw new Error("candidateId requis.");

      const season = await requireSeasonInfoAt();
      if (season.phase !== "vote") {
        throw new Error("Le vote n'est pas ouvert.");
      }

      const voter = await User.findOne({ email: auth.email });
      if (!voter) throw new Error("Utilisateur invalide.");

      await assignCoalitionForEligibleUser(voter._id);

      const refreshedVoter = await User.findById(voter._id).select(
        "discordAccess discordId coalitionOptOut coalitionId"
      );
      const candidate = await User.findById(candidateId).select(
        "discordAccess discordId coalitionId coalitionOptOut"
      );
      if (!isActiveCoalitionMember(refreshedVoter) || !isActiveCoalitionMember(candidate)) {
        throw new Error("Utilisateur invalide.");
      }
      if (voter._id.toString() === candidate._id.toString()) {
        throw new Error("Vous ne pouvez pas voter pour vous-même.");
      }
      if (refreshedVoter.coalitionId !== candidate.coalitionId) {
        throw new Error("Vous ne pouvez voter que dans votre coalition.");
      }

      const candDoc = await CoalitionCandidacy.findOne({
        user: candidate._id,
        seasonKey: season.seasonKey,
      });
      if (!candDoc) {
        throw new Error("Cette personne n'est pas candidate pour cette saison.");
      }

      const selfCand = await CoalitionCandidacy.findOne({
        user: voter._id,
        seasonKey: season.seasonKey,
      });
      if (selfCand) {
        throw new Error("Les candidats ne peuvent pas voter.");
      }

      await CoalitionVote.findOneAndUpdate(
        { voter: voter._id, seasonKey: season.seasonKey },
        {
          $set: {
            candidate: candidate._id,
            coalitionId: refreshedVoter.coalitionId,
          },
          $setOnInsert: {
            voter: voter._id,
            seasonKey: season.seasonKey,
          },
        },
        { upsert: true, new: true }
      );

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: { message: "Vote enregistré." },
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: { message: err.message ?? "Error" },
      };
    }
  }

  async listCandidates(req: Request) {
    try {
      // @ts-ignore
      const auth = req.user as IUser | undefined;
      const coalitionId = req.params.coalitionId as string;
      if (!isCoalitionId(coalitionId)) throw new Error("Coalition invalide.");
      const seasonKey =
        (req.query.seasonKey as string) ||
        (await requireSeasonInfoAt()).seasonKey;

      const rows = await CoalitionCandidacy.find({ seasonKey, coalitionId })
        .populate("user", "discordUsername discordAvatar coalitionId")
        .lean();

      let currentUserVoteCandidateId: string | null = null;
      if (auth?.email) {
        const voter = await User.findOne({ email: auth.email }).select("_id").lean();
        if (voter?._id) {
          const currentVote = await CoalitionVote.findOne({
            voter: voter._id,
            seasonKey,
          })
            .select("candidate")
            .lean();

          currentUserVoteCandidateId = currentVote?.candidate?.toString() ?? null;
        }
      }

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: { candidates: rows, currentUserVoteCandidateId },
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: { message: err.message ?? "Error" },
      };
    }
  }

  async getLeaderboard(req: Request) {
    try {
      const seasonKey =
        (req.query.seasonKey as string) ||
        (await requireSeasonInfoAt()).seasonKey;
      const limit = Math.min(Number(req.query.limit) || 50, 200);

      const global = await UserSeasonStats.find({ seasonKey })
        .sort({ points: -1 })
        .limit(limit)
        .populate("user", "discordUsername discordAvatar coalitionId publicSlug")
        .lean();

      await Promise.all(
        global.map(async (row: any) => {
          if (!row.user?._id || row.user.publicSlug) return;
          row.user.publicSlug = await ensurePublicSlugForUser(row.user._id);
        })
      );

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: { seasonKey, leaderboard: global },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: { message: "Error" },
      };
    }
  }

  async getHistory(_req: Request) {
    try {
      const list = await SeasonResult.find().sort({ seasonKey: -1 }).lean();
      const seasons = await Promise.all(list.map((season) => hydrateSeasonResultLeaders(season)));
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: { seasons },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: { message: "Error" },
      };
    }
  }

  async getSeasonByKey(req: Request) {
    try {
      const key = req.params.seasonKey;
      const doc = await SeasonResult.findOne({ seasonKey: key }).lean();
      if (!doc) {
        return {
          success: false,
          statusCode: 404,
          errors: null,
          data: { message: "Saison introuvable." },
        };
      }
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: { season: await hydrateSeasonResultLeaders(doc) },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: { message: "Error" },
      };
    }
  }

  async getPublicProfile(req: Request) {
    try {
      const slug = req.params.slug;
      const user = await User.findOne({ publicSlug: slug })
        .select({
          _id: 1,
          createdAt: 1,
          coin: 1,
          discordUsername: 1,
          discordAvatar: 1,
          coalitionId: 1,
          publicSlug: 1,
        })
        .lean<
          | {
              _id: IUser["_id"];
              createdAt?: Date;
              coin?: number;
              discordUsername?: string;
              discordAvatar?: string;
              coalitionId?: CoalitionId | null;
              publicSlug?: string | null;
            }
          | null
        >();
      if (!user) {
        return {
          success: false,
          statusCode: 404,
          errors: null,
          data: { message: "Profil introuvable." },
        };
      }

      const season = await getSeasonInfoAt();
      const stats = season
        ? await UserSeasonStats.findOne({
            user: user._id,
            seasonKey: season.seasonKey,
          }).lean()
        : null;

      const ledger = await UserDailyCoinLedger.find({ user: user._id })
        .sort({ dateKey: -1 })
        .limit(2000)
        .select({ dateKey: 1, coinsEarned: 1, _id: 0 })
        .lean();

      let coalitionRank: number | null = null;
      if (season && user.coalitionId) {
        const coalitionRows = await UserSeasonStats.find({
          seasonKey: season.seasonKey,
          coalitionId: user.coalitionId,
        })
          .sort({ points: -1, _id: 1 })
          .select({ user: 1, _id: 0 })
          .lean();

        const currentUserId = user._id.toString();
        const index = coalitionRows.findIndex(
          (row) => row.user?.toString() === currentUserId
        );
        coalitionRank = index >= 0 ? index + 1 : null;
      }

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          user: {
            _id: user._id,
            createdAt: user.createdAt ?? null,
            coin: user.coin ?? 0,
            discordUsername: user.discordUsername ?? "",
            discordAvatar: user.discordAvatar ?? "",
            coalitionId: user.coalitionId ?? null,
            publicSlug: user.publicSlug ?? null,
            coalitionRank,
            seasonPoints: stats?.points ?? 0,
            globalRank: stats?.globalRank ?? null,
          },
          userDailyCoinLedgers: ledger.map((l) => ({
            dateKey: l.dateKey,
            coinsEarned: l.coinsEarned ?? 0,
          })),
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: { message: "Error" },
      };
    }
  }

  computeStreak(
    ledger: { dateKey: string; coinsEarned: number }[]
  ): number {
    const map = new Map(ledger.map((l) => [l.dateKey, l.coinsEarned]));
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 400; i++) {
      const key = getParisDateKey(d);
      const coins = map.get(key) ?? 0;
      if (coins > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  async adminRemoveCoalition(req: Request) {
    try {
      const userId = req.params.userId;
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");
      const season = await requireSeasonInfoAt();
      const prev = user.coalitionId;
      user.coalitionId = null;
      await user.save();
      await UserSeasonStats.deleteMany({
        user: user._id,
        seasonKey: season.seasonKey,
      });
      if (user.discordId) {
        await syncDiscordCoalitionRoles(user.discordId, null);
      }
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: { message: "Utilisateur retirée de la coalition.", previousCoalitionId: prev },
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: { message: err.message ?? "Error" },
      };
    }
  }

  async adminAddCoalitionPoints(req: Request) {
    try {
      const userId = req.params.userId;
      const amount = Number(req.body?.amount);
      if (!Number.isFinite(amount) || amount === 0) {
        throw new Error("Montant invalide.");
      }
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");
      if (!user.coalitionId || !isCoalitionId(user.coalitionId)) {
        throw new Error("Utilisateur sans coalition.");
      }
      const season = await requireSeasonInfoAt();
      await UserSeasonStats.updateOne(
        { user: user._id, seasonKey: season.seasonKey },
        {
          $set: { coalitionId: user.coalitionId },
          $inc: { points: amount },
        },
        { upsert: true }
      );
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: { message: "Points mis à jour." },
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: { message: err.message ?? "Error" },
      };
    }
  }

  async adminExcludeFromSystem(req: Request) {
    try {
      const userId = req.params.userId;
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");
      const season = await requireSeasonInfoAt();
      user.coalitionOptOut = true;
      user.coalitionId = null;
      await user.save();
      await UserSeasonStats.deleteMany({
        user: user._id,
        seasonKey: season.seasonKey,
      });
      if (user.discordId) {
        await syncDiscordCoalitionRoles(user.discordId, null);
      }
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: { message: "Utilisateur exclu du système coalitions." },
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: { message: err.message ?? "Error" },
      };
    }
  }
}

export default CoalitionServices;
