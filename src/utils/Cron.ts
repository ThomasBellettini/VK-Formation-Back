import cron from "node-cron";
import axios from "axios";
import CST from "../server/constants.js";
import User from "../model/User.js";
import EvaluationStat from "../model/learning/EvaluationStat.js";

interface ITranscript {
  text: string;
  language: string;
  start: number;
  end: number;
  confidence: number;
  channel: number;
  speaker: number;
  words: [];
}

export const startCronJob = () => {

  let isRunning = false;

  cron.schedule("* * * * *", async () => {
    if (isRunning) return;
    isRunning = true;
    isRunning = false;
  });

  cron.schedule("0 4 * * *", async () => {
  })

  cron.schedule("0 0 1 * *", async () => {
    const users = await User.find(
      {discordId: {$exists: true, $ne: null}},
      {discordId: 1, _id: 0}
    ).lean();

    const discordIds = users.map(u => u.discordId).filter((id): id is string => !!id && id.trim() !== "");

    const {data} = await axios.post(`${CST.DISCORD.API_URL}/discord/users`, {ids: discordIds,});

    const updates = data.map((u: { id: string; username: string; avatar: string}) => ({
      updateOne: {
        filter: {discordId: u.id},
        update: {$set: {discordUsername: u.username, discordAvatar: u.avatar}},
      }
    }));

    if (updates.length) {
      await User.bulkWrite(updates, { ordered: false });
    }
  });


  /**
   * Cron job idempotent pour migrer les données d'évaluation legacy des users vers la collection EvaluationStat, et supprimer les champs legacy des users.
   * TODO à delete lors de la prochaine mise à jour
   */
  cron.schedule("0 0 1 * *", async () => {
    const BATCH_SIZE = 200;

    function ignoreDuplicateKeyErrors(err: any) {
      // insertMany peut renvoyer un BulkWriteError avec des writeErrors code 11000
      if (!err) return;
      const isDup =
        err.code === 11000 ||
        (Array.isArray(err.writeErrors) && err.writeErrors.every((e: any) => e.code === 11000));
      if (isDup) return;
      throw err;
    }

    while (true) {
      const users = await User.find(
        {
          $or: [
            { evalCount: { $gt: 0 } },
            { "messagesHistory.0": { $exists: true } },
            { "timeHistory.0": { $exists: true } },
          ],
        },
        { _id: 1, evalCount: 1, messagesHistory: 1, timeHistory: 1 }
      )
        .limit(BATCH_SIZE)
        .lean();

      if (users.length === 0) break;

      for (const u of users as any[]) {
        const evalCount = Number(u.evalCount ?? 0);
        const mh: number[] = Array.isArray(u.messagesHistory) ? u.messagesHistory : [];
        const th: number[] = Array.isArray(u.timeHistory) ? u.timeHistory : [];
        const n = Math.max(evalCount, mh.length, th.length);

        if (n <= 0) continue;

        const docs = Array.from({ length: n }).map((_, i) => ({
          evaluator: u._id,
          source: "legacy",
          legacyIndex: i,
          messageCount: typeof mh[i] === "number" ? mh[i] : undefined,
          timeSpentSec: typeof th[i] === "number" ? th[i] : undefined
        }));

        try {
          await EvaluationStat.insertMany(docs, { ordered: false });
        } catch (e) {
          ignoreDuplicateKeyErrors(e);
        }
      }

      const ops = users.map((u: any) => ({
        updateOne: {
          filter: { _id: u._id },
          update: { $unset: { evalCount: "", messagesHistory: "", timeHistory: "" } },
        },
      }));
      await User.bulkWrite(ops, { ordered: false });
    }
  });

  console.log("Cron job started: it will run every minute.");
};
