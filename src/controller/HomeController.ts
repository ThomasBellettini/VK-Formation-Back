import HomeServices from "../services/HomeServices.js";
import { Request, Response } from "express";

const homeServices = new HomeServices();

class HomeController {
  private service: HomeServices;

  constructor(service: HomeServices) {
    this.service = service;
    this.getHome = this.getHome.bind(this);
  }

  public async getHome(req: Request, res: Response) {
    const r = await this.service.getHome(req);
    return res.status(r.statusCode).send(r);
  }
}

export default new HomeController(homeServices);


