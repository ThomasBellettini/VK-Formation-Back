import Planet, { IPlanet } from "../model/learning/Planet.js";
import Lesson from "../model/learning/Lesson.js";
import HolyProject from "../model/learning/HolyProject.js";
import { Request } from "express";
import mongoose from "mongoose";
import StorageCdn from "../utils/StorageCdn.js";
import CST from "../server/constants.js";

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

      if (lessonIds.length > 0) {
        try {
          const existingLessons = await Lesson.find({
            _id: { $in: lessonIds },
          });
          if (existingLessons.length !== lessonIds.length) {
            console.warn("Some lesson IDs were not found:", lessonIds);
          }

          await Lesson.updateMany(
            { _id: { $in: lessonIds } },
            { planet: planet._id }
          );

          console.log(
            `Updated ${existingLessons.length} lessons to reference planet ${planet._id}`
          );
        } catch (error) {
          console.error("Error updating lessons:", error);
        }
      }

      if (projectId) {
        try {
          const existingProject = await HolyProject.findById(projectId);
          if (!existingProject) {
            console.warn("Project ID not found:", projectId);
          } else {
            await HolyProject.findByIdAndUpdate(projectId, {
              planet: planet._id,
            });
            console.log(
              `Updated project ${projectId} to reference planet ${planet._id}`
            );
          }
        } catch (error) {
          console.error("Error updating project:", error);
        }
      }

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
      const planet = await Planet.findOne({ url })
        .populate("courses", "title description url")
        .populate("projects", "name description url")
        .lean();

      if (!planet) {
        return {
          statusCode: 404,
          message: "Planet not found",
        };
      }

      planet.modelName = StorageCdn.generateSecureLink(planet.modelName);
      planet.planetImage = StorageCdn.generateSecureLink(planet.planetImage);

      return {
        statusCode: 200,
        message: "Planet retrieved successfully",
        data: planet,
      };
    } catch (error) {
      console.error("Error in info planet:", error);
      return {
        statusCode: 500,
        message: "Internal server error",
      };
    }
  }

  async update(req: Request, id: string): Promise<IPlanetResponse> {
    try {
      const { name, description, level, url, isDone, lessons, projects } =
        req.body;

      const planet = await Planet.findById(id);
      if (!planet) {
        return {
          statusCode: 404,
          message: "Planet not found",
        };
      }

      // Check if URL is being changed and if it conflicts with another planet
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

      // Parse single project if provided
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

      const updateData: Partial<IPlanet> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (level !== undefined) updateData.level = level;
      if (url !== undefined) updateData.url = url;
      if (modelName !== undefined) updateData.modelName = modelName;
      if (isDone !== undefined) updateData.isDone = isDone;
      if (modelName && modelName !== planet.modelName)
        updateData.modelName = modelName;
      if (planetImage && planetImage !== planet.planetImage)
        updateData.planetImage = planetImage;

      if (lessonIds.length > 0) {
        updateData.courses = lessonIds.map(
          (id) => new mongoose.Types.ObjectId(id)
        );
      }
      if (projectId) {
        updateData.projects = new mongoose.Types.ObjectId(projectId);
      }

      // Update the planet
      const updatedPlanet = await Planet.findByIdAndUpdate(id, updateData, {
        new: true,
      })
        .populate("courses", "name description url")
        .populate("projects", "name description url")
        .lean();

      // Update lessons to reference this planet
      if (lessonIds.length > 0) {
        try {
          // Validate that all lesson IDs exist
          const existingLessons = await Lesson.find({
            _id: { $in: lessonIds },
          });
          if (existingLessons.length !== lessonIds.length) {
            console.warn("Some lesson IDs were not found:", lessonIds);
          }

          // Update lessons to reference this planet
          await Lesson.updateMany({ _id: { $in: lessonIds } }, { planet: id });

          console.log(
            `Updated ${existingLessons.length} lessons to reference planet ${id}`
          );
        } catch (error) {
          console.error("Error updating lessons:", error);
          return {
            statusCode: 500,
            message: "Error updating lessons",
          };
        }
      }

      // Update HolyProject to reference this planet
      if (projectId) {
        try {
          // Validate that the project ID exists
          const existingProject = await HolyProject.findById(projectId);
          if (!existingProject) {
            console.warn("Project ID not found:", projectId);
          } else {
            // Update project to reference this planet
            await HolyProject.findByIdAndUpdate(projectId, { planet: id });
            console.log(
              `Updated project ${projectId} to reference planet ${id}`
            );
          }
        } catch (error) {
          console.error("Error updating project:", error);
          return {
            statusCode: 500,
            message: "Error updating project",
          };
        }
      }

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
