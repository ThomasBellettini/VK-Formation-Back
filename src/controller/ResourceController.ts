import { Request, Response, Express } from "express";
import ResourceServices from "../services/ResourceServices.js";

const resourceServices = new ResourceServices();

class ResourceController {
  private service: ResourceServices;

  constructor(service: ResourceServices) {
    this.service = service;
    this.view = this.view.bind(this);
  }

  public async view(req: Request, res: any) {
    await this.service.view(req, res);
  }
}

export default new ResourceController(resourceServices);
