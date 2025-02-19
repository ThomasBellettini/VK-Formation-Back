import User, { IUser } from "../model/User.js";
import { generateToken } from "../utils/JWTUtils.js";
import mongoose from "mongoose";
import DiscordStats from "../model/DiscordStats.js";
import { Request } from "express";
import CST from "../server/constants.js";
import axios from "axios";

class DiscordServices {
  constructor() {
    this.uploadDailyStat = this.uploadDailyStat.bind(this);
    this.getStats = this.getStats.bind(this);
    this.getSchedule = this.getSchedule.bind(this);
  }

  async uploadDailyStat(req: Request) {
    try {
      let fullStats = req.body;
      let date = new Date();
      date.setDate(date.getDate() - 1);
      date.setHours(0, 0, 0, 0);

      let messages = 0;
      let join = 0;
      let vocal = 0;

      Object.entries(fullStats).map(async ([key, value]) => {
        if (!key.includes("global")) {
          let user = await User.findOne({discordId: key});
          if (user) {
            //TODO Algo de give de point en fonction du temps de vocal
          }
        } else {
          if (key === "join_global")
            join = value as number;
          if (key === "message_global")
            messages = value as number;
          if (key === "voice_global")
            vocal = value as number;
        }
      });

       await DiscordStats.create({
            date: date,
            totalMessages: messages,
            totalVocal: vocal,
            totalNewMembers: join,
        });


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

  async getStats() {
    try {
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
      });
      let response = await axios.get(`${CST.DISCORD.MODULE}/discord/messages`);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          dailyDiscordStats: formattedStats,
          lastAnnouncements: response.data
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
}

export default DiscordServices;
