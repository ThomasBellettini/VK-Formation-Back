import server from "./server/server.js";
import "./server/database.js";
import chalk from "chalk";
import {startCronJob} from "./utils/Cron.js";

async function main() {
    const PORT = process.env.PORT || 5002;
    let httpServer = server.listen(PORT, () => {
        console.log(`App running on port ${PORT}`);
    });
    httpServer.timeout = 7200 * 1000;
    httpServer.keepAliveTimeout = 7200 * 1000;

    try {
        console.log(chalk.blue("> Init admin"));
        console.log(chalk.blue("> Init Cron"));
        // startCronJob();
        console.log(chalk.blue("> Init done"));

    } catch (e: any) {
        console.error(e);
        console.log(chalk.red(`> ${e.toString()}`));
    }

}

main();
