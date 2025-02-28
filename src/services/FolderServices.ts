import {IUser} from "../model/User.js";
import {Request} from "express";
import CourseBundle from "../model/learning/CourseBundle.js";
import {ILesson} from "../model/learning/Lesson.js";
import mongoose from "mongoose";
import StorageCdn from "../utils/StorageCdn.js";
import Folder from "../model/learning/Folder.js";

interface IFolder {
  _id: mongoose.Types.ObjectId;
  title: string;

  lessons: (ILesson | mongoose.Types.ObjectId)[];
  order: number;

  createdAt?: Date;
  updatedAt?: Date;
}

class FolderServices {
  constructor() {
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }


  async list(req: Request) {
    try {
      let folders = await Folder.find({});
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          folders
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
      const {title} = req.body;
      if (!title) {
        throw new Error("Missing mandatory fields title, url, image")
      }
      if (req.body.lessons)
        req.body.lessons = JSON.parse(req.body.lessons);
      let courseBundle = await Folder.create(req.body);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Course has been created with success",
          courseBundle
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

  async update(req: Request, id: string) {
    try {
      let folder = await Folder.findOne({_id: id});
      if (!folder) throw new Error("No Folder has been found with this ID !");
      if (req.body.lessons)
        req.body.lessons = JSON.parse(req.body.lessons);
      folder = await Folder.findOneAndUpdate({_id: id}, req.body, {new: true});

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Folder has been updated with success",
          folder
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
      let folder = await Folder.findOne({_id: id});
      if (!folder) throw new Error("No Folder has been found with this ID !");
      await Folder.findByIdAndDelete(id);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Folder has been deleted with success",
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
export default FolderServices;
