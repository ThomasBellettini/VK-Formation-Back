import { Request, Response, Express } from "express";
import LessonServices from "../services/LessonServices.js";

const lessonServices = new LessonServices();

class LessonController {
  private service: LessonServices;

  constructor(service: LessonServices) {
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
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const keepAlive = setInterval(() => {
      res.write("data: still processing...\n\n");
    }, 5000);

    const r = await this.service.add(req);
    clearInterval(keepAlive);
    res.status(r.statusCode).send(r);
  }

  public async update(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const keepAlive = setInterval(() => {
      res.write("data: still processing...\n\n");
    }, 5000);
    const r = await this.service.update(req, req.params.id);
    clearInterval(keepAlive);
    return res.status(r.statusCode).send(r);
  }

  public async info(req: Request, res: Response) {
    const r = await this.service.info(req, req.params.url);
    return res.status(r.statusCode).send(r);
  }

  public async delete(req: Request, res: Response) {
    const r = await this.service.delete(req.params.id);
    return res.status(r.statusCode).send(r);
  }

}

export default new LessonController(lessonServices);
