import cron from "node-cron";
import axios from "axios";
import CST from "../server/constants.js";
import User from "../model/User.js";

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

  cron.schedule("0 0 * * *", async () => {
    console.log("Launching cron: updating Discord usernames and avatars...");
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

  console.log("Cron job started: it will run every minute.");
};
