import Polaris, { IPolaris } from "../model/learning/Polaris.js";
import Planet, { IPlanet } from "../model/learning/Planet.js";
import { Request } from "express";
import mongoose, { model, modelNames } from "mongoose";
import StorageCdn from "../utils/StorageCdn.js";
import CST from "../server/constants.js";
import User, { IUser } from "../model/User.js";
import { getUserLevelForPolaris } from "../utils/utils.js";

interface IPolarisResponse {
  statusCode: number;
  message: string;
  data?: any;
}

class PolarisServices {
  constructor() {
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.info = this.info.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  async list(req: Request): Promise<IPolarisResponse> {
    try {
      const polarisList = await Polaris.find().populate("planets").lean();

      for (const polaris of polarisList) {
        polaris.imageUrl = StorageCdn.generateSecureLink(polaris.imageUrl);
      }

      return {
        statusCode: 200,
        message: "Polaris list retrieved successfully",
        data: polarisList,
      };
    } catch (error) {
      console.error("Error in list polaris:", error);
      return {
        statusCode: 500,
        message: "Internal server error",
      };
    }
  }

  async add(req: Request): Promise<IPolarisResponse> {
    try {
      const { name, description, level, url, identifier, planets } = req.body;

      if (!name || !level || !url || !identifier) {
        return {
          statusCode: 400,
          message: "Missing required fields: name, level, url, identifier",
        };
      }

      // Check if polaris with same URL already exists
      const existingPolaris = await Polaris.findOne({ url });
      if (existingPolaris) {
        return {
          statusCode: 409,
          message: "Polaris with this URL already exists",
        };
      }

      // Check if polaris with same identifier already exists
      const existingPolarisByIdentifier = await Polaris.findOne({ identifier });
      if (existingPolarisByIdentifier) {
        return {
          statusCode: 409,
          message: "Polaris with this identifier already exists",
        };
      }

      // Validate planets if provided
      let planetIds: string[] = [];
      if (planets && Array.isArray(planets)) {
        for (const planetId of planets) {
          const planet = await Planet.findById(planetId);
          if (!planet) {
            return {
              statusCode: 404,
              message: `Planet with id ${planetId} not found`,
            };
          }
        }
        planetIds = planets;
      }

      let imageUrl: string | undefined;
      const file = req.file as Express.Multer.File | undefined;
      if (file) {
        const identifier = await StorageCdn.generateRandomFilename(
          file.originalname
        );
        const filePath = `polaris/${identifier}`;
        const { bunnyFilePath } = await StorageCdn.uploadFile(
          file.path,
          filePath,
          file.originalname,
          false
        );
        imageUrl = bunnyFilePath;
      }

      const polaris = new Polaris({
        name,
        description: description || "",
        level,
        url,
        identifier,
        planets: planetIds,
        imageUrl,
      });

      await polaris.save();

      if (planetIds.length > 0) {
        await Planet.updateMany(
          { _id: { $in: planetIds } },
          { polaris: polaris._id }
        );
      }

      return {
        statusCode: 201,
        message: "Polaris created successfully",
        data: polaris,
      };
    } catch (error) {
      console.error("Error in add polaris:", error);
      return {
        statusCode: 500,
        message: "Internal server error",
      };
    }
  }

  async info(req: Request, url: string): Promise<IPolarisResponse> {
    try {
      // @ts-ignore
      const user = req.user as IUser;

      const polaris = await Polaris.findOne({ url })
        .populate({
          path: "planets",
          populate: [
            {
              path: "courses",
              model: "Lesson",
            },
            {
              path: "projects",
              model: "HolyProject",
            },
          ],
        })
        .lean();

      if (!polaris) {
        return {
          statusCode: 404,
          message: "Polaris not found",
        };
      }

      let userLevel = 0;
      if (user) {
        userLevel = await getUserLevelForPolaris(user, polaris.identifier);
      }

      const planetsWithPermission = polaris.planets.map((planet: any) => {
        const secureLinkModel = StorageCdn.generateSecureLink(planet.modelName);
        console.log("HERE DUDE MODEL", planet.name, planet.modelName);
        console.log("HERE DUDE URL", secureLinkModel);
        return {
          ...planet,
          modelName: secureLinkModel,
          planetImage: StorageCdn.generateSecureLink(planet.planetImage),
          hasPermission: user.permission === 'admin' || 'formateur' ? true : userLevel >= planet.level,
        };
      });

      const polarisWithPermissions = {
        ...polaris,
        planets: planetsWithPermission,
      };

      return {
        statusCode: 200,
        message: "Polaris retrieved successfully",
        data: polarisWithPermissions,
      };
    } catch (error) {
      console.error("Error in info polaris:", error);
      return {
        statusCode: 500,
        message: "Internal server error",
      };
    }
  }

  async update(req: Request, id: string): Promise<IPolarisResponse> {
    try {
      const { name, description, level, url, identifier } = req.body;
      const planets = JSON.parse(req.body.planets || "[]");
      const polaris = await Polaris.findById(id);

      if (!polaris) {
        return {
          statusCode: 404,
          message: "Polaris not found",
        };
      }

      if (url && url !== polaris.url) {
        const existingPolaris = await Polaris.findOne({
          url,
          _id: { $ne: id },
        });
        if (existingPolaris) {
          return {
            statusCode: 409,
            message: "Polaris with this URL already exists",
          };
        }
      }

      if (identifier && identifier !== polaris.identifier) {
        const existingPolaris = await Polaris.findOne({
          identifier,
          _id: { $ne: id },
        });
        if (existingPolaris) {
          return {
            statusCode: 409,
            message: "Polaris with this identifier already exists",
          };
        }
      }

      if (planets !== undefined) {
        if (Array.isArray(planets)) {
          for (const planetId of planets) {
            const planet = await Planet.findById(planetId);
            if (!planet) {
              return {
                statusCode: 404,
                message: `Planet with id ${planetId} not found`,
              };
            }
          }
        }

        await Planet.updateMany({ polaris: id }, { $unset: { polaris: 1 } });

        if (planets.length > 0) {
          await Planet.updateMany({ _id: { $in: planets } }, { polaris: id });
        }
      }

      const updateData: Partial<IPolaris> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (url !== undefined) updateData.url = url;
      if (identifier !== undefined) updateData.identifier = identifier;
      if (planets !== undefined) updateData.planets = planets;

      const file = req.file as Express.Multer.File | undefined;
      if (file) {
        const identifier = await StorageCdn.generateRandomFilename(
          file.originalname
        );
        const filePath = `polaris/${identifier}`;
        const { bunnyFilePath } = await StorageCdn.uploadFile(
          file.path,
          filePath,
          file.originalname,
          false
        );
        (updateData as any).imageUrl = bunnyFilePath as any;
      }

      const updatedPolaris = await Polaris.findByIdAndUpdate(id, updateData, {
        new: true,
      })
        .populate("planets", "name description url level isDone")
        .lean();

      return {
        statusCode: 200,
        message: "Polaris updated successfully",
        data: updatedPolaris,
      };
    } catch (error) {
      console.error("Error in update polaris:", error);
      return {
        statusCode: 500,
        message: "Internal server error",
      };
    }
  }

  async delete(id: string): Promise<IPolarisResponse> {
    try {
      const polaris = await Polaris.findById(id);

      if (!polaris) {
        return {
          statusCode: 404,
          message: "Polaris not found",
        };
      }

      await Planet.updateMany({ polaris: id }, { $unset: { polaris: 1 } });

      await Polaris.findByIdAndDelete(id);

      return {
        statusCode: 200,
        message: "Polaris deleted successfully",
      };
    } catch (error) {
      console.error("Error in delete polaris:", error);
      return {
        statusCode: 500,
        message: "Internal server error",
      };
    }
  }
}

export default PolarisServices;
