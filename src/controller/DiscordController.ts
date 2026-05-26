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
    this.getShopItems = this.getShopItems.bind(this);
    this.updateShopItems = this.updateShopItems.bind(this);
    this.updateRegex = this.updateRegex.bind(this);
    this.getRegex = this.getRegex.bind(this);
    this.syncCoalitionRoles = this.syncCoalitionRoles.bind(this);
  }

  public async syncCoalitionRoles(req: Request, res: any) {
    const r = await this.service.syncCoalitionRoles(req);
    return res.status(r.statusCode).send(r);
  }

  public async uploadDailyStat(req: Request, res: any) {
    const r = await this.service.uploadDailyStat(req);
    return res.status(r.statusCode).send(r);
  }

  public async getStats(req: Request, res: any) {
    const r = await this.service.getStats(req);
    return res.status(r.statusCode).send(r);
  }

  public async getSchedule(req: Request, res: any) {
    const r = await this.service.getSchedule();
    return res.status(r.statusCode).send(r);
  }

  public async updateShopItems(req: Request, res: any) {
    const r = await this.service.updateShopItems(req);
    return res.status(r.statusCode).send(r);
  }

  public async updateRegex(req: Request, res: any) {
    const r = await this.service.updateRegex(req);
    return res.status(r.statusCode).send(r);
  }

  public async getShopItems(req: Request, res: any) {
    const r = await this.service.getShopItems();
    return res.status(r.statusCode).send(r);
  }

  public async getRegex(req: Request, res: any) {
    const r = await this.service.getRegex();
    return res.status(r.statusCode).send(r);
  }
}

export default new DiscordController(discordServices);
