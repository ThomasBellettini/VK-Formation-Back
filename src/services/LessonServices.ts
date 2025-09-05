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
      const authUser = req.user;
      if (!authUser?.email) throw new Error("Unauthenticated.");

      const [databaseUser, lesson] = await Promise.all([
        User.findOne({email: authUser.email}),
        Lesson.findOne({url}).populate("planet").lean(),
      ]);

      if (!lesson) throw new Error("No lesson was founded !");
      if (!databaseUser) throw new Error("No user found !");

      const lessonId = lesson._id as mongoose.Types.ObjectId;

      const res = await User.updateOne(
          {_id: databaseUser._id, lessonsFinished: {$ne: lessonId}},
          {$addToSet: {lessonsFinished: lessonId}, $inc: {coin: 25}}
      );

      // @ts-ignore
      lesson.finished = true;

      if (res.matchedCount === 0) {
        return {
          success: true,
          statusCode: 201,
          errors: null,
          data: {lesson, planetJustCompleted: false},
        };
      }

      let planetDoc:
          | (Awaited<ReturnType<typeof Planet.findById>> & { polaris?: any })
          | null = null;

      if (lesson.planet) {
        planetDoc = await Planet.findById((lesson.planet as any)._id)
            .populate("polaris")
            .lean();
      } else {
        planetDoc = await Planet.findOne({courses: lessonId})
            .populate("polaris")
            .lean();
      }

      // @ts-ignore
      if (!planetDoc?._id) {
        return {
          success: true,
          statusCode: 201,
          errors: null,
          data: {lesson, planetJustCompleted: false},
        };
      }

      // @ts-ignore
      const planetId = planetDoc._id;

      let planetLessonIds: string[] = [];

      const lessonsByPlanet = await Lesson.find({planet: planetId})
          .select("_id")
          .lean();

      if (lessonsByPlanet.length > 0) {
        planetLessonIds = lessonsByPlanet.map((l) => l._id.toString());
      } else {
        const planetFromCourses = await Planet.findById(planetId)
            .select("courses")
            .lean();
        planetLessonIds = (planetFromCourses?.courses ?? []).map((id: any) =>
            id.toString()
        );
      }

      const freshUser = await User.findById(databaseUser._id)
          .select("lessonsFinished holyProjects planetsFinished")
          .lean();

      const userFinishedLessonIds = (freshUser?.lessonsFinished ?? []).map(
          (id: any) => id.toString()
      );

      const allLessonsFinished =
          planetLessonIds.length > 0 &&
          planetLessonIds.every((id) => userFinishedLessonIds.includes(id));

      if (!allLessonsFinished) {
        return {
          success: true,
          statusCode: 201,
          errors: null,
          data: {lesson, planetJustCompleted: false},
        };
      }

      const planetProject = await HolyProject.findOne({planet: planetId})
          .select("_id")
          .lean();

      let projectOk = false;

      if (planetProject?._id) {
        const targetId = planetProject._id.toString();
        projectOk =
            projectOk ||
            (freshUser?.holyProjects ?? []).some((p: any) => {
              const projId =
                  typeof p.project === "string"
                      ? p.project
                      : p.project?._id?.toString();
              return projId === targetId && (p.resultPercent ?? 0) >= 80;
            });
      }

      const polarisIdentifier = planetDoc?.polaris?.identifier
          ? String(planetDoc.polaris.identifier)
          : null;

      if (!projectOk && polarisIdentifier) {
        projectOk =
            (freshUser?.holyProjects ?? []).some(
                (p: any) => p.polaris === polarisIdentifier && (p.resultPercent ?? 0) >= 80
            ) || false;
      }

      if (!projectOk) {
        return {
          success: true,
          statusCode: 201,
          errors: null,
          data: {lesson, planetJustCompleted: false},
        };
      }

      const addPlanetRes = await User.updateOne(
          {_id: databaseUser._id, planetsFinished: {$ne: planetId}},
          {$addToSet: {planetsFinished: planetId}}
      );

      const planetJustCompleted = addPlanetRes.modifiedCount > 0;

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {lesson, planetJustCompleted},
      };
    } catch (err: any) {
      console.error(err);
      return {
        success: false,
        statusCode: 500,
        errors: err?.message ?? String(err),
        data: {message: err?.message ?? String(err)},
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
