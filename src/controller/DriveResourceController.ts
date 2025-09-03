import { Request, Response, Express } from "express";
import DriveResourceServices from "../services/DriveResourceServices.js";

const driveResourceServices = new DriveResourceServices();

class DriveResourceController {
  private service: DriveResourceServices;

  constructor(service: DriveResourceServices) {
    this.service = service;
    this.add = this.add.bind(this);
    this.list = this.list.bind(this);
    this.info = this.info.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  public async add(req: Request, res: any) {
    const r = await this.service.add(req);
    return res.status(r.statusCode).send(r);
  }

  public async list(req: Request, res: any) {
    const r = await this.service.list(req);
    return res.status(r.statusCode).send(r);
  }

  public async info(req: Request, res: any) {
    const r = await this.service.info(req.params.id);
    return res.status(r.statusCode).send(r);
  }

  public async update(req: Request, res: any) {
    const r = await this.service.update(req, req.params.id);
    return res.status(r.statusCode).send(r);
  }

  public async delete(req: Request, res: any) {
    const r = await this.service.delete(req.params.id);
    return res.status(r.statusCode).send(r);
  }
}

export default new DriveResourceController(driveResourceServices);
