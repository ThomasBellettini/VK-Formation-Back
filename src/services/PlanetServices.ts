import Planet, { IPlanet } from "../model/learning/Planet.js";
import { Request } from "express";
import mongoose from "mongoose";
import StorageCdn from "../utils/StorageCdn.js";
import CST from "../server/constants.js";

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
    try {
      const planets = await Planet.find()
        .populate('courses', 'name description url')
        .populate('projects', 'name description url')
        .lean();

      return {
        statusCode: 200,
        message: "Planets retrieved successfully",
        data: planets
      };
    } catch (error) {
      console.error("Error in list planets:", error);
      return {
        statusCode: 500,
        message: "Internal server error"
      };
    }
  }

  async add(req: Request): Promise<IPlanetResponse> {
    try {
      const { name, description, level, url } = req.body;
      
      if (!name || !description || !level || !url) {
        return {
          statusCode: 400,
          message: "Missing required fields: name, description, level, url"
        };
      }

      // Check if planet with same URL already exists
      const existingPlanet = await Planet.findOne({ url });
      if (existingPlanet) {
        return {
          statusCode: 409,
          message: "Planet with this URL already exists"
        };
      }
      
      let modelName = "";
      if (req.file) {
        const identifier = await StorageCdn.generateRandomFilename(req.file.originalname);
        let filePath = `model/${identifier}`;
        let { bunnyFilePath, duration } = await StorageCdn.uploadFile(req.file.path, filePath, req.file.originalname, false);
        req.body.modelName = bunnyFilePath;
      } else {
          throw new Error("Missing image file");
      }

      const planet = new Planet({
        name,
        description,
        level,
        url,
        modelName,
        isDone: false
      });

      await planet.save();

      const populatedPlanet = await Planet.findById(planet._id)
        .populate('courses', 'name description url')
        .populate('projects', 'name description url')
        .lean();

      return {
        statusCode: 201,
        message: "Planet created successfully",
        data: populatedPlanet
      };
    } catch (error) {
      console.error("Error in add planet:", error);
      return {
        statusCode: 500,
        message: "Internal server error"
      };
    }
  }

  async info(req: Request, url: string): Promise<IPlanetResponse> {
    try {
      const planet = await Planet.findOne({ url })
        .populate('courses', 'name description url')
        .populate('projects', 'name description url')
        .lean();

      if (!planet) {
        return {
          statusCode: 404,
          message: "Planet not found"
        };
      }

      return {
        statusCode: 200,
        message: "Planet retrieved successfully",
        data: planet
      };
    } catch (error) {
      console.error("Error in info planet:", error);
      return {
        statusCode: 500,
        message: "Internal server error"
      };
    }
  }

  async update(req: Request, id: string): Promise<IPlanetResponse> {
    try {
      const { name, description, level, url, isDone } = req.body;
      
      const planet = await Planet.findById(id);
      if (!planet) {
        return {
          statusCode: 404,
          message: "Planet not found"
        };
      }

      // Check if URL is being changed and if it conflicts with another planet
      if (url && url !== planet.url) {
        const existingPlanet = await Planet.findOne({ url, _id: { $ne: id } });
        if (existingPlanet) {
          return {
            statusCode: 409,
            message: "Planet with this URL already exists"
          };
        }
      }

      let modelName = planet.modelName;
      if (req.file) {
        const identifier = await StorageCdn.generateRandomFilename(req.file.originalname);
        let filePath = `model/${identifier}`;
        let { bunnyFilePath, duration } = await StorageCdn.uploadFile(req.file.path, filePath, req.file.originalname, false);
        req.body.modelName = bunnyFilePath;
      } else {
          throw new Error("Missing image file");
      }

      const updateData: Partial<IPlanet> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (level !== undefined) updateData.level = level;
      if (url !== undefined) updateData.url = url;
      if (modelName !== undefined) updateData.modelName = modelName;
      if (isDone !== undefined) updateData.isDone = isDone;
      if (modelName !== planet.modelName) updateData.modelName = modelName;

      const updatedPlanet = await Planet.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      )
        .populate('courses', 'name description url')
        .populate('projects', 'name description url')
        .lean();

      return {
        statusCode: 200,
        message: "Planet updated successfully",
        data: updatedPlanet
      };
    } catch (error) {
      console.error("Error in update planet:", error);
      return {
        statusCode: 500,
        message: "Internal server error"
      };
    }
  }

  async delete(id: string): Promise<IPlanetResponse> {
    try {
      const planet = await Planet.findByIdAndDelete(id);
      
      if (!planet) {
        return {
          statusCode: 404,
          message: "Planet not found"
        };
      }

      return {
        statusCode: 200,
        message: "Planet deleted successfully"
      };
    } catch (error) {
      console.error("Error in delete planet:", error);
      return {
        statusCode: 500,
        message: "Internal server error"
      };
    }
  }
}

export default PlanetServices; 