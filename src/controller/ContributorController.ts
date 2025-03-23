import { Request, Response, Express } from "express";
import FolderServices from "../services/FolderServices.js";
import ContributorServices from "../services/ContributorServices.js";

const folderServices = new ContributorServices();

class ContributorController {
  private service: ContributorServices;

  constructor(service: ContributorServices) {
    this.service = service;
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
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

  public async delete(req: Request, res: Response) {
    const r = await this.service.delete(req.params.id);
    return res.status(r.statusCode).send(r);
  }


}

export default new ContributorController(folderServices);
