import { Request, Response, Express } from "express";
import CommentServices from "../services/CommentServices.js";

const commentServices = new CommentServices();

class CommentController {
  private service: CommentServices;

  constructor(service: CommentServices) {
    this.service = service;
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.delete = this.delete.bind(this);
    this.like = this.like.bind(this);
    this.unlike = this.unlike.bind(this);
  }

  public async list(req: Request, res: Response) {
    const r = await this.service.list(req, req.params.id);
    return res.status(r.statusCode).send(r);
  }

  public async add(req: Request, res: Response) {
    const r = await this.service.add(req, req.params.id);
    return res.status(r.statusCode).send(r);
  }

  public async delete(req: Request, res: Response) {
    const r = await this.service.delete(req, req.params.id);
    return res.status(r.statusCode).send(r);
  }

  public async like(req: Request, res: Response) {
    const r = await this.service.like(req, req.params.id);
    return res.status(r.statusCode).send(r);
  }

  public async unlike(req: Request, res: Response) {
    const r = await this.service.unlike(req, req.params.id);
    return res.status(r.statusCode).send(r);
  }
}

export default new CommentController(commentServices);
