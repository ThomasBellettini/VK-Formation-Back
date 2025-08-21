import ActualityServices from "../services/ActualityServices.js";
import { Request, Response } from "express";

const actualityService = new ActualityServices();

class ActualityController {
  private service: ActualityServices;

  constructor(service: ActualityServices) {
    this.service = service;
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.info = this.info.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  public async list(req: Request, res: Response) {
    const r = await this.service.list(req);
    return res.status(r.statusCode).send(r);
  }

  public async add(req: Request, res: Response) {
    const r = await this.service.add(req);
    return res.status(r.statusCode).send(r);
  }

  public async info(req: Request, res: Response) {
    const r = await this.service.info(req, req.params.url);
    return res.status(r.statusCode).send(r);
  }

  public async update(req: Request, res: Response) {
    const r = await this.service.update(req, req.params.id);
    return res.status(r.statusCode).send(r);
  }

  public async delete(req: Request, res: Response) {
    const r = await this.service.delete(req.params.id);
    return res.status(r.statusCode).send(r);
  }
}

export default new ActualityController(actualityService);


