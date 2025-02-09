import HolyProject from "../model/learning/HolyProject.js";
import User, {IUser} from "../model/User.js";
import {Request} from "express";
import {ICourseBundle} from "../model/learning/CourseBundle.js";
import mongoose from "mongoose";
import StorageCdn from "../utils/StorageCdn.js";
import Resource from "../model/Resource.js";
import jwt from "jsonwebtoken";
import CST from "../server/constants.js";

class ResourceServices {
  constructor() {
    this.view = this.view.bind(this);
  }

  async view(req: Request, res: any) {
    try {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
      res.setHeader("Access-Control-Expose-Headers", "Accept-Ranges, Content-Range, Content-Length");

      let resourcePath = req.query.path as string;
      if (!resourcePath) {
        return res.status(400).json({ error: "Path is required to view resource" });
      }

      let resource = await Resource.findOne({ pathFile: resourcePath });
      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }

      const rangeHeader = req.headers.range;

      if (!rangeHeader) {
        return res.status(416).json({ error: "Range request required" });
      }

      const { stream, headers } = await StorageCdn.getStream(resourcePath, rangeHeader);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      res.writeHead(206, headers);
      stream.pipe(res);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erreur inconnue" });
    }
  }

}
export default ResourceServices;
