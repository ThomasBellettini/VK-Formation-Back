import Lesson from "../model/learning/Lesson.js";
import User, { IUser } from "../model/User.js";
import { Request } from "express";
import { ILesson } from "../model/learning/Lesson.js";
import mongoose from "mongoose";
import ffmpeg, { FfprobeData } from "fluent-ffmpeg";
import StorageCdn from "../utils/StorageCdn.js";
import Planet from "../model/learning/Planet.js";
import HolyProject from "../model/learning/HolyProject.js";

class LessonServices {
  constructor() {
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.update = this.update.bind(this);
    this.info = this.info.bind(this);
    this.delete = this.delete.bind(this);
    this.completeLesson = this.completeLesson.bind(this);
  }

  async list(req: Request) {
    const { type } = req.query;

    try {
      let lessons = await Lesson.find().lean();
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          lessons,
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
          message: err,
        },
      };
    }
  }

  async completeLesson(req: Request, url: string) {
    try {
      // @ts-ignore
      let user = req.user as IUser;
      let databaseUser = await User.findOne({ email: user.email });
      let lesson = await Lesson.findOne({ url: url }).populate("planet").lean();
      if (!lesson) throw new Error("No lesson was founded !");
      if (!databaseUser) throw new Error("No user found !");
      if (!databaseUser.lessonsFinished.includes(lesson._id)) {
        databaseUser.lessonsFinished.push(lesson._id);
        databaseUser.coin += 25;
        await databaseUser.save();
        // @ts-ignore
        lesson.finished = true;

        if (lesson.planet) {
          const planet = lesson.planet as any;

          const allPlanetLessons = await Lesson.find({
            planet: planet._id,
          }).lean();
          const allPlanetLessonIds = allPlanetLessons.map((l) =>
            l._id.toString()
          );

          const userFinishedLessonIds = databaseUser.lessonsFinished.map(
            (lessonId) =>
              typeof lessonId === "string" ? lessonId : lessonId.toString()
          );

          const allLessonsFinished = allPlanetLessonIds.every((lessonId) =>
            userFinishedLessonIds.includes(lessonId)
          );

          if (allLessonsFinished) {
            const planetProject = await HolyProject.findOne({
              planet: planet._id,
            }).lean();

            if (planetProject) {
              const userProject = databaseUser.holyProjects.find(
                (project) =>
                  project.polaris === planet.polaris?.identifier ||
                  (typeof project.project === "string"
                    ? project.project === planetProject._id.toString()
                    : project.project._id.toString() ===
                      planetProject._id.toString())
              );

              if (userProject && userProject.resultPercent >= 80) {
                if (!databaseUser.planetsFinished.includes(planet._id)) {
                  databaseUser.planetsFinished.push(planet._id);
                  await databaseUser.save();
                }
              }
            }
          }
        }
      }
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          lesson,
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
          message: err,
        },
      };
    }
  }

  async info(req: Request, url: string) {
    try {
      // @ts-ignore
      let user = req.user as IUser;
      let databaseUser = await User.findOne({ email: user.email });
      let lesson = await Lesson.findOne({ url: url }).lean();
      if (!lesson) throw new Error("No lesson was founded !");
      if (!databaseUser) throw new Error("No user found !");
      if (databaseUser.lessonsFinished.includes(lesson._id)) {
        // @ts-ignore
        lesson.finished = true;
      }

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          lesson,
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
          message: err,
        },
      };
    }
  }

  async delete(id: string) {
    try {
      let lesson = await Lesson.findById(id).lean();
      if (!lesson) throw new Error("No lesson was founded !");

      await Lesson.findByIdAndDelete(id);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Success, lesson deleted !",
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
          message: err,
        },
      };
    }
  }

  async add(req: Request) {
    try {
      const { description, url, title } = req.body;
      if (!description || !url || !title) {
        throw new Error("Missing mandatory fields description, url, title");
      }
      if (req.file) {
        const identifier = await StorageCdn.generateRandomFilename(
          req.file.originalname
        );
        let filePath = `upload/${identifier}`;
        let { bunnyFilePath, duration } = await StorageCdn.uploadFile(
          req.file.path,
          filePath,
          req.file.originalname,
          true
        );
        req.body.cdnVideoContent = bunnyFilePath;
        req.body.duration = duration;
      }
      if (req.body.links) req.body.links = JSON.parse(req.body.links);
      let lesson = await Lesson.create(req.body);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Lesson has been created with success",
          lesson,
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
          message: err,
        },
      };
    }
  }

  async update(req: Request, id: string) {
    try {
      let lesson = await Lesson.findOne({ _id: id });
      if (!lesson) throw new Error("No Lesson has been found with this ID !");
      if (req.file) {
        const identifier = await StorageCdn.generateRandomFilename(
          req.file.originalname
        );
        let filePath = `upload/${identifier}`;
        let { bunnyFilePath, duration } = await StorageCdn.uploadFile(
          req.file.path,
          filePath,
          req.file.originalname,
          true
        );
        req.body.cdnVideoContent = bunnyFilePath;
        req.body.duration = duration;
      }
      if (req.body.links) req.body.links = JSON.parse(req.body.links);
      lesson = await Lesson.findOneAndUpdate({ _id: id }, req.body);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Lesson has been updated with success",
          lesson,
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
          message: err,
        },
      };
    }
  }
}
export default LessonServices;
