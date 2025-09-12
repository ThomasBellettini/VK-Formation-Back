import Planet, { IPlanet } from "../model/learning/Planet.js";
import Lesson from "../model/learning/Lesson.js";
import HolyProject from "../model/learning/HolyProject.js";
import { Request } from "express";
import mongoose from "mongoose";
import StorageCdn from "../utils/StorageCdn.js";
import CST from "../server/constants.js";
import User from "../model/User.js";

type FilesMap = Record<string, Express.Multer.File[]>;

interface IPlanetResponse {
  statusCode: number;
  message: string;
  data?: any;
}

class PlanetServices {
  constructor() {
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.info = this.info.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  async list(req: Request): Promise<IPlanetResponse> {
    const { type } = req.query;

    try {
      const planets = await Planet.find()
        .populate("courses", "name description url")
        .populate("projects", "name description url")
        .lean();

      return {
        statusCode: 200,
        message: "Planets retrieved successfully",
        data: planets,
      };
    } catch (error) {
      console.error("Error in list planets:", error);
      return {
        statusCode: 500,
        message: "Internal server error",
      };
    }
  }

  async add(req: Request): Promise<IPlanetResponse> {
    try {
      const { name, description, level, url, lessons, projects } = req.body;

      if (!name || !description || !level || !url) {
        return {
          statusCode: 400,
          message: "Missing required fields: name, description, level, url",
        };
      }

      // Check if planet with same URL already exists
      const existingPlanet = await Planet.findOne({ url });
      if (existingPlanet) {
        return {
          statusCode: 409,
          message: "Planet with this URL already exists",
        };
      }

      const files = (req.files ?? {}) as FilesMap;
      const modelFile = files.modelName?.[0];
      const planetFile = files.planetImage?.[0];
      let modelName = "";
      let planetImage = "";

      if (modelFile) {
        const identifier = await StorageCdn.generateRandomFilename(
          modelFile.originalname
        );
        let filePath = `model/${identifier}`;
        let { bunnyFilePath, duration } = await StorageCdn.uploadFile(
          modelFile.path,
          filePath,
          modelFile.originalname,
          false
        );
        req.body.modelName = bunnyFilePath;
        modelName = bunnyFilePath;
      } else {
        throw new Error("Missing model file");
      }

      if (planetFile) {
        const identifier = await StorageCdn.generateRandomFilename(
          planetFile.originalname
        );
        let filePath = `planetImage/${identifier}`;
        let { bunnyFilePath, duration } = await StorageCdn.uploadFile(
          planetFile.path,
          filePath,
          planetFile.originalname,
          false
        );
        req.body.planetImage = bunnyFilePath;
        planetImage = bunnyFilePath;
      } else {
        throw new Error("Missing planet snapshot file");
      }

      let lessonIds: string[] = [];
      if (lessons) {
        try {
          lessonIds = JSON.parse(lessons);
          if (!Array.isArray(lessonIds)) {
            lessonIds = [lessonIds];
          }
        } catch (error) {
          console.error("Error parsing lessons:", error);
          return {
            statusCode: 400,
            message: "Invalid lessons format. Expected JSON array.",
          };
        }
      }

      let projectId: string | null = null;
      if (projects) {
        try {
          const parsedProject = JSON.parse(projects);
          projectId = Array.isArray(parsedProject)
            ? parsedProject[0]
            : parsedProject;
        } catch (error) {
          console.error("Error parsing project:", error);
          return {
            statusCode: 400,
            message:
              "Invalid project format. Expected JSON string or array with single project ID.",
          };
        }
      }

      const planet = new Planet({
        name,
        description,
        level,
        url,
        modelName,
        planetImage,
        isDone: false,
        projects: projectId
          ? new mongoose.Types.ObjectId(projectId)
          : undefined,
        courses: lessonIds.map((id) => new mongoose.Types.ObjectId(id)),
      });

      await planet.save();

      await Lesson.updateMany(
          { _id: { $in: lessonIds } },
          { $set: { planet: planet._id } }
      );

      // @ts-ignore
      await HolyProject.updateMany(
          { _id: { $in: projectId } },
          { $set: { planet: planet._id } }
      );

      const populatedPlanet = await Planet.findById(planet._id)
        .populate("courses", "name description url")
        .populate("projects", "name description url")
        .lean();

      return {
        statusCode: 201,
        message: "Planet created successfully",
        data: populatedPlanet,
      };
    } catch (error) {
      console.error("Error in add planet:", error);
      return {
        statusCode: 500,
        message: "Internal server error",
      };
    }
  }

  async info(req: Request, url: string): Promise<IPlanetResponse> {
    try {
      // @ts-ignore
      const authUser = req.user;
      if (!authUser?.email) {
        return { statusCode: 401, message: "Unauthenticated." };
      }

      const planet = await Planet.findOne({ url })
          .select("_id name description modelName planetImage level courses projects")
          .populate({ path: "courses", select: "title description url" })
          .populate({ path: "projects", select: "name description url" })
          .lean();

      if (!planet) {
        return { statusCode: 404, message: "Planet not found" };
      }

      const user = await User.findOne({ email: authUser.email })
          .select("lessonsFinished holyProjects")
          .lean();
      if (!user) {
        return { statusCode: 404, message: "User not found" };
      }

      const finishedLessonIds = new Set(
          (user.lessonsFinished ?? []).map((id: any) =>
              typeof id === "string" ? id : id?.toString?.()
          )
      );

      const courses = (planet.courses as any[] | undefined)?.map((l) => ({
        _id: l._id,
        title: l.title,
        description: l.description,
        url: l.url,
        isDone: finishedLessonIds.has(l._id.toString()),
      })) ?? [];

      let project: any = planet.projects || null;
      let successPercent: number | undefined;

      if (project?._id) {
        const projectIdStr = project._id.toString();

        const best = (user.holyProjects ?? [])
            .filter((p: any) => {
              const pid =
                  typeof p.project === "string"
                      ? p.project
                      : p.project?._id?.toString();
              return pid === projectIdStr;
            })
            .map((p: any) => {
              const raw = p?.resultPercent;
              const val = typeof raw === "number" ? raw : Number(raw ?? 0);
              return Number.isFinite(val) ? val : 0;
            })
            .reduce((a: number, b: number) => Math.max(a, b), 0);

        if (best >= 80) successPercent = best;

        project = {
          _id: project._id,
          name: project.name,
          description: project.description,
          url: project.url,
          ...(successPercent !== undefined ? { percent: successPercent } : {}),
        };
      }

      const modelName = StorageCdn.generateSecureLink(planet.modelName);
      const planetImage = StorageCdn.generateSecureLink(planet.planetImage);

      return {
        statusCode: 200,
        message: "Planet retrieved successfully",
        data: {
          ...planet,
          modelName,
          planetImage,
          courses,
          projects: project,
        },
      };
    } catch (error) {
      console.error("Error in info planet:", error);
      return { statusCode: 500, message: "Internal server error" };
    }
  }

  async update(req: Request, id: string): Promise<IPlanetResponse> {
    try {
      const { name, description, level, url, isDone, courses, projects } =
        req.body;

      const planet = await Planet.findById(id);
      if (!planet) {
        return {
          statusCode: 404,
          message: "Planet not found",
        };
      }

      if (url && url !== planet.url) {
        const existingPlanet = await Planet.findOne({ url, _id: { $ne: id } });
        if (existingPlanet) {
          return {
            statusCode: 409,
            message: "Planet with this URL already exists",
          };
        }
      }

      const files = (req.files ?? {}) as FilesMap;
      const modelFile = files.modelName?.[0];
      const planetFile = files.planetImage?.[0];
      let modelName = "";
      let planetImage = "";

      if (modelFile) {
        const identifier = await StorageCdn.generateRandomFilename(
          modelFile.originalname
        );

        let filePath = `model/${identifier}`;
        let { bunnyFilePath, duration } = await StorageCdn.uploadFile(
          modelFile.path,
          filePath,
          modelFile.originalname,
          false
        );
        req.body.modelName = bunnyFilePath;
        modelName = bunnyFilePath;
      }

      if (planetFile) {
        const identifier = await StorageCdn.generateRandomFilename(
          planetFile.originalname
        );
        let filePath = `planetImage/${identifier}`;
        let { bunnyFilePath, duration } = await StorageCdn.uploadFile(
          planetFile.path,
          filePath,
          planetFile.originalname,
          false
        );
        req.body.planetImage = bunnyFilePath;
        planetImage = bunnyFilePath;
      }

      // Parse lessons array if provided
      let lessonIds: string[] = [];
      if (courses) {
        try {
          lessonIds = JSON.parse(courses);
          if (!Array.isArray(lessonIds)) {
            lessonIds = [lessonIds];
          }
          await Lesson.updateMany(
              { _id: { $in: lessonIds } },
              { $set: { planet: planet._id } }
          );
        } catch (error) {
          console.error("Error parsing lessons:", error);
          return {
            statusCode: 400,
            message: "Invalid lessons format. Expected JSON array.",
          };
        }
      }

      // Parse single project if provided
      let projectId: string | null = null;
      if (projects) {
        try {
          const parsedProject = JSON.parse(projects);
          projectId = Array.isArray(parsedProject)
            ? parsedProject[0]
            : parsedProject;
          // @ts-ignore
          await HolyProject.updateMany(
              { _id: { $in: projectId } },
              { $set: { planet: planet._id } }
          );
        } catch (error) {
          console.error("Error parsing project:", error);
          return {
            statusCode: 400,
            message:
              "Invalid project format. Expected JSON string or array with single project ID.",
          };
        }
      }

      const updateData: Partial<IPlanet> = {};

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (level !== undefined) updateData.level = level;
      if (url !== undefined) updateData.url = url;
      if (isDone !== undefined) updateData.isDone = isDone;
      if (
        modelName &&
        modelName !== undefined &&
        modelName !== planet.modelName
      )
        updateData.modelName = modelName;
      if (
        planetImage &&
        planetImage !== undefined &&
        planetImage !== planet.planetImage
      )
        updateData.planetImage = planetImage;

      if (lessonIds.length > 0) {
        updateData.courses = lessonIds.map(
          (id) => new mongoose.Types.ObjectId(id)
        );
      }
      if (projectId) {
        updateData.projects = new mongoose.Types.ObjectId(projectId);
      }

      const updatedPlanet = await Planet.findByIdAndUpdate(id, updateData, {
        new: true,
      })
        .populate("courses", "name description url")
        .populate("projects", "name description url")
        .lean();

      return {
        statusCode: 200,
        message: "Planet updated successfully",
        data: updatedPlanet,
      };
    } catch (error) {
      console.error("Error in update planet:", error);
      return {
        statusCode: 500,
        message: "Internal server error",
      };
    }
  }

  async delete(id: string): Promise<IPlanetResponse> {
    try {
      const planet = await Planet.findByIdAndDelete(id);

      if (!planet) {
        return {
          statusCode: 404,
          message: "Planet not found",
        };
      }

      return {
        statusCode: 200,
        message: "Planet deleted successfully",
      };
    } catch (error) {
      console.error("Error in delete planet:", error);
      return {
        statusCode: 500,
        message: "Internal server error",
      };
    }
  }
}

export default PlanetServices;
