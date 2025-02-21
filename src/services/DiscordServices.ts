import User, { IUser } from "../model/User.js";
import DiscordStats from "../model/DiscordStats.js";
import { Request } from "express";
import CST from "../server/constants.js";
import axios from "axios";
import {getOrCreateDiscordData} from "../model/Discord.js";

class DiscordServices {
  constructor() {
    this.uploadDailyStat = this.uploadDailyStat.bind(this);
    this.getStats = this.getStats.bind(this);
    this.getSchedule = this.getSchedule.bind(this);
    this.updateShopItems = this.updateShopItems.bind(this);
    this.getShopItems = this.getShopItems.bind(this);
  }

  async uploadDailyStat(req: Request) {
    try {
      let fullStats = req.body;
      let date = new Date();
      date.setDate(date.getDate());
      date.setHours(0, 0, 0, 0);

      let messages = (req.body.messages as number) || 0;
      let join = (req.body.join as number) || 0;
      let vocal = (req.body.voice as number) || 0;
      if (req.query.full && req.query.full === "true") {
        Object.entries(fullStats).map(async ([key, value]) => {
          let user = await User.findOne({discordId: key});
          if (user) {
            //TODO Mettre a jour les coins en fonction des points
          }
        });
      } else {
        let discordStats = await DiscordStats.findOne({date: date});
        if (!discordStats) {
          await DiscordStats.create({
            date: date,
            totalMessages: messages,
            totalVocal: vocal,
            totalNewMembers: join,
          });
        } else {
          discordStats.totalMessages += messages;
          discordStats.totalVocal += vocal;
          discordStats.totalNewMembers += join;
          await discordStats.save();
        }
      }

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Daily stats uploaded !",
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: "Error, no user found !",
        },
      };
    }
  }

  async getStats(req: Request) {
    try {
      // @ts-ignore
      let user = req.user as IUser;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const stats = await DiscordStats.find({
        date: { $gte: sevenDaysAgo }
      }).sort({ date: 1 });

      const formattedStats: Record<string, { totalMessages: number; totalVocal: number; totalNewMembers: number }> = {};

      stats.forEach(stat => {
        const formattedDate = stat.date.toISOString().split('T')[0];
        formattedStats[formattedDate] = {
          totalMessages: stat.totalMessages,
          totalVocal: stat.totalVocal,
          totalNewMembers: stat.totalNewMembers
        };
      })
      let response;
      if (user) {
        let response = await axios.get(`${CST.DISCORD.MODULE}/discord/messages`);
        return {
          success: true,
          statusCode: 201,
          errors: null,
          data: {
            dailyDiscordStats: formattedStats,
            lastAnnouncements: response
          },
        };
      } else {
        return {
          success: true,
          statusCode: 201,
          errors: null,
          data: {
            dailyDiscordStats: formattedStats,
            lastAnnouncements: []
          },
        };
      }


    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        token: null,
        data: {
          message: err
        },
      };
    }
  }

  async getSchedule() {
    try {
      let response = await axios.get(`${CST.DISCORD.MODULE}/discord/schedule`);
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          events: response.data
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        token: null,
        data: {
          message: err
        },
      };
    }
  }

  async getShopItems() {
    try {
      let discordData = await getOrCreateDiscordData();
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          items: discordData.shopItems
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        token: null,
        data: {
          message: err
        },
      };
    }
  }

  async updateShopItems(req: Request) {
    try {
      let discordData = await getOrCreateDiscordData();
      discordData.shopItems = req.body.items;
      await discordData.save();

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          items: req.body.items ? req.body.items : []
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        token: null,
        data: {
          message: err
        },
      };
    }
  }
}

export default DiscordServices;
