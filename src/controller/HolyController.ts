import HolyServices from "../services/HolyServices.js";
import { Request, Response, Express } from "express";

const holyService = new HolyServices();

class HolyController {
  private service: HolyServices;

  constructor(service: HolyServices) {
    this.service = service;
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
  }

  public async list(req: Request, res: Response) {
    const r = await this.service.list(req);
    return res.status(r.statusCode).send(r);
  }

  public async add(req: Request, res: Response) {
    const r = await this.service.add(req);
    return res.status(r.statusCode).send(r);
  }

}

export default new HolyController(holyService);
