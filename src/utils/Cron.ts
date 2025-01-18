import cron from "node-cron";

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

  console.log("Cron job started: it will run every minute.");
};
