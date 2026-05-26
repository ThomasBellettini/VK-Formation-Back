import CoalitionServices from "../services/CoalitionServices.js";
import { Request, Response } from "express";

const coalitionServices = new CoalitionServices();

class CoalitionController {
  private service: CoalitionServices;

  constructor(service: CoalitionServices) {
    this.service = service;
    this.getOverview = this.getOverview.bind(this);
    this.submitCandidacy = this.submitCandidacy.bind(this);
    this.castVote = this.castVote.bind(this);
    this.listCandidates = this.listCandidates.bind(this);
    this.getLeaderboard = this.getLeaderboard.bind(this);
    this.getHistory = this.getHistory.bind(this);
    this.getSeasonByKey = this.getSeasonByKey.bind(this);
    this.getPublicProfile = this.getPublicProfile.bind(this);
    this.adminRemoveCoalition = this.adminRemoveCoalition.bind(this);
    this.adminAddCoalitionPoints = this.adminAddCoalitionPoints.bind(this);
    this.adminExcludeFromSystem = this.adminExcludeFromSystem.bind(this);
  }

  public async getOverview(req: Request, res: Response) {
    const r = await this.service.getOverview(req);
    return res.status(r.statusCode).send(r);
  }

  public async submitCandidacy(req: Request, res: Response) {
    const r = await this.service.submitCandidacy(req);
    return res.status(r.statusCode).send(r);
  }

  public async castVote(req: Request, res: Response) {
    const r = await this.service.castVote(req);
    return res.status(r.statusCode).send(r);
  }

  public async listCandidates(req: Request, res: Response) {
    const r = await this.service.listCandidates(req);
    return res.status(r.statusCode).send(r);
  }

  public async getLeaderboard(req: Request, res: Response) {
    const r = await this.service.getLeaderboard(req);
    return res.status(r.statusCode).send(r);
  }

  public async getHistory(req: Request, res: Response) {
    const r = await this.service.getHistory(req);
    return res.status(r.statusCode).send(r);
  }

  public async getSeasonByKey(req: Request, res: Response) {
    const r = await this.service.getSeasonByKey(req);
    return res.status(r.statusCode).send(r);
  }

  public async getPublicProfile(req: Request, res: Response) {
    const r = await this.service.getPublicProfile(req);
    return res.status(r.statusCode).send(r);
  }

  public async adminRemoveCoalition(req: Request, res: Response) {
    const r = await this.service.adminRemoveCoalition(req);
    return res.status(r.statusCode).send(r);
  }

  public async adminAddCoalitionPoints(req: Request, res: Response) {
    const r = await this.service.adminAddCoalitionPoints(req);
    return res.status(r.statusCode).send(r);
  }

  public async adminExcludeFromSystem(req: Request, res: Response) {
    const r = await this.service.adminExcludeFromSystem(req);
    return res.status(r.statusCode).send(r);
  }
}

export default new CoalitionController(coalitionServices);
