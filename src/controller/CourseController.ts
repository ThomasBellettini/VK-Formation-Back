import { Request, Response, Express } from "express";
import CourseServices from "../services/CourseServices.js";

const courseServices = new CourseServices();

class CourseController {
  private service: CourseServices;

  constructor(service: CourseServices) {
    this.service = service;
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.info = this.info.bind(this);
    this.update = this.update.bind(this);
  }

  public async list(req: Request, res: Response) {
    const r = await this.service.list(req);
    return res.status(r.statusCode).send(r);
  }

  public async add(req: Request, res: Response) {
    const r = await this.service.add(req);
    return res.status(r.statusCode).send(r);
  }

  public async update(req: Request, res: Response) {
    const r = await this.service.update(req, req.params.id);
    return res.status(r.statusCode).send(r);
  }

  public async info(req: Request, res: Response) {
    const r = await this.service.info(req, req.params.url);
    return res.status(r.statusCode).send(r);
  }

}

export default new CourseController(courseServices);