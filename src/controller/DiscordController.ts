import AuthServices from "../services/DiscordServices.js";
import { Request, Response, Express } from "express";
import User from "../model/User";
import DiscordServices from "../services/DiscordServices.js";

const discordServices = new DiscordServices();

class DiscordController {
  private service: DiscordServices;

  constructor(service: DiscordServices) {
    this.service = service;
    this.uploadDailyStat = this.uploadDailyStat.bind(this);
    this.getStats = this.getStats.bind(this);
    this.getSchedule = this.getSchedule.bind(this);
  }

  public async uploadDailyStat(req: Request, res: any) {
    const r = await this.service.uploadDailyStat(req);
    return res.status(r.statusCode).send(r);
  }

  public async getStats(req: Request, res: any) {
    const r = await this.service.getStats();
    return res.status(r.statusCode).send(r);
  }

  public async getSchedule(req: Request, res: any) {
    const r = await this.service.getSchedule();
    return res.status(r.statusCode).send(r);
  }
}

export default new DiscordController(discordServices);
