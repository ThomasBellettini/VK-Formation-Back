import Lesson from "../model/learning/Lesson.js";
import User, { IUser } from "../model/User.js";
import { Request } from "express";
import { ILesson } from "../model/learning/Lesson.js";
import mongoose from "mongoose";
import ffmpeg, { FfprobeData } from "fluent-ffmpeg";
import StorageCdn from "../utils/StorageCdn.js";
import Planet from "../model/learning/Planet.js";
import HolyProject from "../model/learning/HolyProject.js";
import CST from '../server/constants.js';

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

  hasProjectAtLeast80 (p: any) {
    const raw = p?.resultPercent;
    const pct = typeof raw === "number" ? raw : Number(raw ?? 0);
    return Number.isFinite(pct) && pct >= 80;
  }

  async completeLesson(req: Request, url: string) {
    try {
      // @ts-ignore
      const authUser = req.user;
      if (!authUser?.email) throw new Error("Unauthenticated.");

      // 1) User + Lesson (+ planetId si présent)
      const [databaseUser, lesson] = await Promise.all([
        User.findOne({ email: authUser.email }).select("_id").lean(),
        Lesson.findOne({ url }).populate({ path: "planet", select: "_id" }).lean(),
      ]);

      if (!databaseUser) throw new Error("No user found !");
      if (!lesson) throw new Error("No lesson was founded !");

      const lessonId = lesson._id as mongoose.Types.ObjectId;

      // 2) Marquer la leçon finie (idempotent) + coins
      const addLessonRes = await User.updateOne(
          { _id: databaseUser._id, lessonsFinished: { $ne: lessonId } },
          { $addToSet: { lessonsFinished: lessonId }, $inc: { coin: 25 } }
      );

      // @ts-ignore pour la réponse
      (lesson as any).finished = true;

      // Si c'était déjà fini -> on sort tôt
      if (addLessonRes.matchedCount === 0) {
        return {
          success: true,
          statusCode: 201,
          errors: null,
          data: { lesson, planetJustCompleted: false },
        };
      }

      // 3) Identifier la planète + récupérer courses & projects d’un coup
      let planetDoc:
          | (Awaited<ReturnType<typeof Planet.findById>> & { courses?: any[]; projects?: any })
          | null = null;

      const planetIdFromLesson =
          (lesson as any)?.planet?._id ?? null;

      if (planetIdFromLesson) {
        planetDoc = await Planet.findById(planetIdFromLesson)
            .select("_id courses projects")
            .lean();
      } else {
        planetDoc = await Planet.findOne({ courses: lessonId })
            .select("_id courses projects")
            .lean();
      }

      // @ts-ignore
      if (!planetDoc?._id) {
        return {
          success: true,
          statusCode: 201,
          errors: null,
          data: { lesson, planetJustCompleted: false },
        };
      }

      // @ts-ignore
      const planetId = planetDoc._id as mongoose.Types.ObjectId;
      let planetLessonIds = (planetDoc.courses ?? []) as mongoose.Types.ObjectId[];

      if (!planetLessonIds.length) {
        return {
          success: true,
          statusCode: 201,
          errors: null,
          data: { lesson, planetJustCompleted: false },
        };
      }

      const freshUser = await User.findById(databaseUser._id)
          .select("lessonsFinished holyProjects planetsFinished")
          .lean();

      const finishedSet = new Set(
          (freshUser?.lessonsFinished ?? []).map((id: any) => id.toString())
      );

      const allLessonsFinished =
          planetLessonIds.length > 0 &&
          planetLessonIds.every((id: any) => finishedSet.has(id.toString()));

      if (!allLessonsFinished) {
        return {
          success: true,
          statusCode: 201,
          errors: null,
          data: { lesson, planetJustCompleted: false },
        };
      }

      const projectId = planetDoc.projects as mongoose.Types.ObjectId | undefined;
      if (!projectId) {
        return {
          success: true,
          statusCode: 201,
          errors: null,
          data: { lesson, planetJustCompleted: false },
        };
      }

      const projectOk = (freshUser?.holyProjects ?? []).some((p: any) => {
        const projId =
            typeof p.project === "string" ? p.project : p.project?._id?.toString();
        return projId === projectId.toString() && this.hasProjectAtLeast80(p);
      });

      if (!projectOk) {
        return {
          success: true,
          statusCode: 201,
          errors: null,
          data: { lesson, planetJustCompleted: false },
        };
      }

      const addPlanetRes = await User.updateOne(
          { _id: databaseUser._id, planetsFinished: { $ne: planetId } },
          { $addToSet: { planetsFinished: planetId } }
      );

      const planetJustCompleted = addPlanetRes.modifiedCount > 0;

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: { lesson, planetJustCompleted },
      };
    } catch (err: any) {
      console.error(err);
      return {
        success: false,
        statusCode: 500,
        errors: err?.message ?? String(err),
        data: { message: err?.message ?? String(err) },
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
      lesson.cdnVideoContent = `https://iframe.mediadelivery.net/embed/${CST.STORAGE.BUNNY_LIBS_ID}/${lesson.cdnVideoContent}`;

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
        let { bunnyFilePath, duration } = await StorageCdn.uploadVideoFile(
          req.file.path,
          req.file.originalname,
            {
              persist: true,
              detached: true
            }
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
        let { bunnyFilePath, duration } = await StorageCdn.uploadVideoFile(
          req.file.path,
          req.file.originalname
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
