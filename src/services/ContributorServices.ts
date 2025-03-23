import {Request} from "express";
import mongoose from "mongoose";
import StorageCdn from "../utils/StorageCdn.js";
import Folder from "../model/learning/Folder.js";
import Contributor from "../model/Contributor.js";


class ContributorServices {
  constructor() {
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.delete = this.delete.bind(this);
  }


  async list(req: Request) {
    try {
      let contributors = await Contributor.find({}).sort({ name: 1 });
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          contributors
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        token: null,
        data: {
          message:err,
        },
      };
    }
  }

  async add(req: Request) {
    try {
      const {name} = req.body;
      if (!name) {
        throw new Error("Missing mandatory fields name");
      }
      if (!req.file) {
        throw new Error("Missing image file !");
      } else {
        const identifier = await StorageCdn.generateRandomFilename(req.file.originalname);
        let filePath = `images/${identifier}`;
        let { bunnyFilePath, duration } = await StorageCdn.uploadFile(req.file.path, filePath, req.file.originalname, false);
        req.body.image = bunnyFilePath;
      }
      let contributor = await Contributor.create(req.body);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Contributor has been created with success",
          contributor
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        token: null,
        data: {
          message:err,
        },
      };
    }
  }

  async delete(id: string) {
    try {
      let contributor = await Contributor.findOne({_id: id});
      if (!contributor) throw new Error("No Contributor has been found with this ID !");
      await Contributor.findByIdAndDelete(id);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Contributor has been deleted with success",
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        token: null,
        data: {
          message:err,
        },
      };
    }
  }

}
export default ContributorServices;
