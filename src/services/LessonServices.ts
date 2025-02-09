import Lesson from "../model/learning/Lesson.js";
import User, {IUser} from "../model/User.js";
import {Request} from "express";
import {ILesson} from "../model/learning/Lesson.js";
import mongoose from "mongoose";
import StorageCdn from "../utils/StorageCdn.js";

class LessonServices {
  constructor() {
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.update = this.update.bind(this);
    this.info = this.info.bind(this);
  }

  async list(req: Request) {
    try {
      let lessons = await Lesson.find({}).lean();
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          lessons
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

  async info(req: Request, url: string) {
    try {
      // @ts-ignore
      let user = req.user as IUser;
      let databaseUser = await User.findOne({email: user.email});
      let lesson = await Lesson.findOne({url: url}).lean();
      if (!lesson) throw new Error('No lesson was founded !');
      if (!databaseUser) throw new Error('No user found !');
      if (!databaseUser.lessonsFinished.includes(lesson._id)) {
        databaseUser.lessonsFinished.push(lesson._id);
        await databaseUser.save();
      }
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          lesson
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
      const {description, url, title} = req.body;
      if (!description || !url || !title) {
        throw new Error("Missing mandatory fields description, url, title")
      }
      if (req.file) {
        const identifier = await StorageCdn.generateRandomFilename(req.file.originalname);
        let filePath = `upload/${identifier}`;
        filePath = await StorageCdn.uploadFile(req.file.buffer, filePath, req.file.originalname, true);
        req.body.cdnVideoContent = filePath;
      }
      let lesson = await Lesson.create(req.body);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Lesson has been created with success",
          lesson
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
      let lesson = await Lesson.findOne({_id: id});
      if (!lesson) throw new Error("No Lesson has been found with this ID !");
      if (req.file) {
        const identifier = await StorageCdn.generateRandomFilename(req.file.originalname);
        let filePath = `upload/${identifier}`;
        filePath = await StorageCdn.uploadFile(req.file.buffer, filePath, req.file.originalname, true);
        req.body.cdnVideoContent = filePath;
      }
      lesson = await Lesson.findOneAndUpdate({_id: id}, req.body);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Lesson has been updated with success",
          lesson
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
export default LessonServices;
