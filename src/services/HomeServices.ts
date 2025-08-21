import { Request } from "express";
import Actuality from "../model/Actualities.js";
import DiscordServices from "./DiscordServices.js";

interface IHomeResponse {
  statusCode: number;
  message: string;
  data?: any;
}

class HomeServices {
  private discordServices: DiscordServices;

  constructor() {
    this.discordServices = new DiscordServices();
    this.getHome = this.getHome.bind(this);
  }

  public async getHome(req: Request): Promise<IHomeResponse> {
    try {
      const actualities = await Actuality.find({ position: { $in: [1, 2] } })
        .select("imageUrl position url")
        .sort({ position: 1 })
        .lean();

      let nextWorkshop: { name: string; description: string } | null = null;
      try {
        const scheduleResponse = await this.discordServices.getSchedule();
        const events = scheduleResponse?.data?.events || [];

        if (Array.isArray(events) && events.length > 0) {
          let candidate = events[0];
          try {
            const withDate = events
              .filter((e: any) => e?.date)
              .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            if (withDate.length > 0) {
              const now = Date.now();
              const upcoming = withDate.find((e: any) => new Date(e.date).getTime() >= now);
              candidate = upcoming || withDate[0];
            }
          } catch {}

          nextWorkshop = {
            name: candidate?.name || candidate?.title || "",
            description: candidate?.description || candidate?.desc || candidate?.details || "",
          };
        }
      } catch (e) {
        console.log(e);
      }

      return {
        statusCode: 200,
        message: "Home data retrieved successfully",
        data: {
          actualities,
          nextWorkshop,
        },
      };
    } catch (error) {
      console.error("Error building home data:", error);
      return {
        statusCode: 500,
        message: "Internal server error",
      };
    }
  }
}

export default HomeServices;


