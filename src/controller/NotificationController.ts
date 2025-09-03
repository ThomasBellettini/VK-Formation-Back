import NotificationServices from "../services/NotificationServices.js";
import { Request, Response } from "express";
import { IUser } from "../model/User.js";

const notificationServices = new NotificationServices();

class NotificationController {
  private service: NotificationServices;

  constructor(service: NotificationServices) {
    this.service = service;
    this.add = this.add.bind(this);
    this.delete = this.delete.bind(this);
    this.deleteAll = this.deleteAll.bind(this);
    this.list = this.list.bind(this);
  }

  public async add(req: Request, res: Response) {
    const r = await this.service.add(req);
    return res.status(r.statusCode).send(r);
  }

  public async delete(req: Request, res: Response) {
    const notificationId = req.params.id;
    
    const r = await this.service.delete(req, notificationId);
    return res.status(r.statusCode).send(r);
  }

  public async deleteAll(req: Request, res: Response) {
    
    const r = await this.service.deleteAll(req);
    return res.status(r.statusCode).send(r);
  }

  public async list(req: Request, res: Response) {
    
    const r = await this.service.list(req);
    return res.status(r.statusCode).send(r);
  }
}

export default new NotificationController(notificationServices);
