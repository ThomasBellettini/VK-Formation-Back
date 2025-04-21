import AuthServices from "../services/DiscordServices.js";
import { Request, Response, Express } from "express";
import User from "../model/User";
import DiscordServices from "../services/DiscordServices.js";
import RecruitmentServices from "../services/RecruitmentServices.js";
import Recruitment from "../model/Recruitment.js";
import recruitment from "../model/Recruitment.js";

const recruitmentService = new RecruitmentServices();

class RecruitmentController {
  private service: RecruitmentServices;

  constructor(service: RecruitmentServices) {
    this.service = service;
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.update = this.update.bind(this);
  }

  public async list(req: Request, res: any) {
    const r = await this.service.list();
    return res.status(r.statusCode).send(r);
  }

  public async add(req: Request, res: any) {
    const r = await this.service.add(req.body);
    return res.status(r.statusCode).send(r);
  }

  public async update(req: Request, res: any) {
    const r = await this.service.update(req.body, req.params.id);
    return res.status(r.statusCode).send(r);
  }
}

export default new RecruitmentController(recruitmentService);
