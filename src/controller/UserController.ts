import AuthServices from "../services/AuthServices.js";
import { Request, Response, Express } from "express";
import UserServices from "../services/UserServices.js";

const userServices = new UserServices();

class UserController {
  private service: UserServices;

  constructor(service: UserServices) {
    this.service = service;
    this.list = this.list.bind(this);
    this.update = this.update.bind(this);
  }

  public async list(req: Request, res: any) {
    const r = await this.service.list();
    return res.status(r.statusCode).send(r);
  }

  public async update(req: Request, res: any) {
    const r = await this.service.update(req, req.params.id);
    return res.status(r.statusCode).send(r);
  }

}

export default new UserController(userServices);
