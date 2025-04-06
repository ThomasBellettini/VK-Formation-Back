import AuthServices from "../services/AuthServices.js";
import { Request, Response, Express } from "express";
import User from "../model/User";

const formServices = new AuthServices();

class AuthController {
  private service: AuthServices;

  constructor(service: AuthServices) {
    this.service = service;
    this.me = this.me.bind(this);
    this.login = this.login.bind(this);
    this.register = this.register.bind(this);
    this.accountConfirmation = this.accountConfirmation.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.registerWebhook = this.registerWebhook.bind(this);
    this.deleteWebhook = this.deleteWebhook.bind(this);
  }

  public async me(req: Request, res: any) {
    const r = await this.service.me(
        // @ts-ignore
        req.user
    );
    return res.status(r.statusCode).send(r);
  }

  public async forgotPassword(req: Request, res: any) {
    const r = await this.service.forgotPassword(
        req.body.email
    );
    return res.status(r.statusCode).send(r);
  }

  public async resetPassword(req: Request, res: any) {
    const r = await this.service.resetPassword(
      req.body.code,
      req.body.password
    );
    return res.status(r.statusCode).send(r);
  }

  public async login(req: Request, res: any) {
    const r = await this.service.login(req.body.email, req.body.password);
    return res.status(r.statusCode).send(r);
  }

  public async register(req: Request, res: Response) {
    const r = await this.service.register(
        req.body.email,
        req.body.password
    );
    return res.status(r.statusCode).send(r);
  }

  public async registerWebhook(req: Request, res: Response) {
    const r = await this.service.registerWebhook(
        req
    );
    return res.status(r.statusCode).send(r);
  }

  public async accountConfirmation(req: Request, res: Response) {
    const r = await this.service.accountConfirmation(
        req.body.code
    );
    return res.status(r.statusCode).send(r);
  }

  public async deleteWebhook(req: Request, res: Response) {
    const r = await this.service.deleteWebhook(
        req
    );
    return res.status(r.statusCode).send(r);
  }
}

export default new AuthController(formServices);
