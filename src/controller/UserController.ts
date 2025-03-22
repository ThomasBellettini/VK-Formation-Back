import AuthServices from "../services/AuthServices.js";
import { Request, Response, Express } from "express";
import UserServices from "../services/UserServices.js";
import {IUser} from "../model/User";

const userServices = new UserServices();

class UserController {
  private service: UserServices;

  constructor(service: UserServices) {
    this.service = service;
    this.list = this.list.bind(this);
    this.update = this.update.bind(this);
    this.add = this.add.bind(this);
    this.delete = this.delete.bind(this);
    this.info = this.info.bind(this);
    this.generateDiscordLink = this.generateDiscordLink.bind(this);
    this.linkDiscord = this.linkDiscord.bind(this);
    this.userByDiscord = this.userByDiscord.bind(this);
    this.makeTransaction = this.makeTransaction.bind(this);
    this.connectedAs = this.connectedAs.bind(this);
  }

  public async list(req: Request, res: any) {
    const r = await this.service.list(req);
    return res.status(r.statusCode).send(r);
  }

  public async update(req: Request, res: any) {
    const r = await this.service.update(req, req.params.id);
    return res.status(r.statusCode).send(r);
  }

  public async add(req: Request, res: any) {
    const r = await this.service.add(req);
    return res.status(r.statusCode).send(r);
  }

  public async delete(req: Request, res: any) {
    const r = await this.service.delete(req.params.id);
    return res.status(r.statusCode).send(r);
  }

  public async info(req: Request, res: any) {
    const r = await this.service.info(req.params.id);
    return res.status(r.statusCode).send(r);
  }

  public async generateDiscordLink(req: Request, res: any) {
    // @ts-ignore
    const r = await this.service.generateDiscordLink(req.user as IUser);
    return res.status(r.statusCode).send(r);
  }

  public async linkDiscord(req: Request, res: any) {
    const r = await this.service.linkDiscord(req);
    return res.status(r.statusCode).send(r);
  }

  public async userByDiscord(req: Request, res: any) {
    const r = await this.service.userByDiscord(req.params.id);
    return res.status(r.statusCode).send(r);
  }

  public async makeTransaction(req: Request, res: any) {
    const r = await this.service.makeTransaction(req.body.discordId, req.body.itemId);
    return res.status(r.statusCode).send(r);
  }

  public async connectedAs(req: Request, res: any) {
    const r = await this.service.connectedAs(req.params.id);
    return res.status(r.statusCode).send(r);
  }

}

export default new UserController(userServices);
