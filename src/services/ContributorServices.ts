import {Request} from "express";
import mongoose from "mongoose";
import StorageCdn from "../utils/StorageCdn.js";
import Folder, {IFolder} from "../model/learning/Folder.js";
import Contributor, {IContributor} from "../model/Contributor.js";
import {ILesson} from "../model/learning/Lesson";


class ContributorServices {
  constructor() {
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.delete = this.delete.bind(this);
  }


  async list(req: Request) {
    try {
      let contributorsDB = await Contributor.find({}).collation({ locale: 'fr', strength: 1 }).sort({ name: 1 }) as IContributor[];

      let contributors: IContributor[] = contributorsDB.map((contributor) => {
        let imageLink = StorageCdn.generateSecureLink(contributor.image);
        return {
          _id: contributor._id,
          image: imageLink,
          name: contributor.name,
          createdAt: contributor.createdAt,
          updatedAt: contributor.updatedAt
        } as IContributor;
      });


      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          collaborators: contributors
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
      const name = req.body.name;
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
          collaborator: contributor
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
