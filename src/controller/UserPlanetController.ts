import UserPlanetService from "../services/UserPlanetService.js";
import { Request, Response } from "express";

const userPlanetService = new UserPlanetService();

class UserPlanetController {
  private service: UserPlanetService;

  constructor(service: UserPlanetService) {
    this.service = service;
    this.getUserFinishedPlanets = this.getUserFinishedPlanets.bind(this);
    this.getUserPlanetProgress = this.getUserPlanetProgress.bind(this);
  }

  public async getUserFinishedPlanets(req: Request, res: Response) {
    const r = await this.service.getUserFinishedPlanets(req);
    return res.status(r.statusCode).send(r);
  }

  public async getUserPlanetProgress(req: Request, res: Response) {
    const r = await this.service.getUserPlanetProgress(req, req.params.planetId);
    return res.status(r.statusCode).send(r);
  }
}

export default new UserPlanetController(userPlanetService); 