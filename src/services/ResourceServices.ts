import {Request} from "express";
import StorageCdn from "../utils/StorageCdn.js";
import Resource from "../model/Resource.js";
import storageCdn from "../utils/StorageCdn.js";

class ResourceServices {
  constructor() {
    this.view = this.view.bind(this);
    this.download = this.download.bind(this);
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

  async download(req: Request, res: any) {
    try {
      let resourcePath = req.params.path as string;
      if (!resourcePath) {
        return res.status(400).json({ error: "Path is required to view resource" });
      }
      resourcePath = `evaluation/${resourcePath}`;
      let resource = await Resource.findOne({ pathFile: resourcePath });
      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }
      let secureUrl = storageCdn.generateSecureLink(resourcePath);
      res.redirect(secureUrl);

    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erreur inconnue" });
    }
  }



}
export default ResourceServices;
