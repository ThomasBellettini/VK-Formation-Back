import HolyServices from "../services/HolyServices.js";
import { Request, Response, Express } from "express";

const holyService = new HolyServices();

class HolyController {
  private service: HolyServices;

  constructor(service: HolyServices) {
    this.service = service;
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.info = this.info.bind(this);
    this.update = this.update.bind(this);
    this.generateEvaluation = this.generateEvaluation.bind(this);
    this.evaluateInfo = this.evaluateInfo.bind(this);
    this.evaluateUpdateUser = this.evaluateUpdateUser.bind(this);
    this.delete = this.delete.bind(this);
    this.hasEvaluationLink = this.hasEvaluationLink.bind(this);
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

  public async generateEvaluation(req: Request, res: Response) {
    const r = await this.service.generateEvaluation(req, req.body.project);
    return res.status(r.statusCode).send(r);
  }

  public async hasEvaluationLink(req: Request, res: Response) {
    const r = await this.service.hasEvaluationLink(req, req.params.url);
    return res.status(r.statusCode).send(r);
  }

  public async evaluateInfo(req: Request, res: Response) {
    const r = await this.service.evaluateInfo(req, req.params.id);
    return res.status(r.statusCode).send(r);
  }

  public async evaluateUpdateUser(req: Request, res: Response) {
    const r = await this.service.evaluateUpdateUser(req, req.params.id);
    return res.status(r.statusCode).send(r);
  }

  public async delete(req: Request, res: Response) {
    const r = await this.service.delete(req.params.id);
    return res.status(r.statusCode).send(r);
  }
}

export default new HolyController(holyService);
