import { Request } from "express";
import DriveResource, { IDriveResource } from "../model/DriveResource.js";

class DriveResourceServices {
  constructor() {
    this.add = this.add.bind(this);
    this.list = this.list.bind(this);
    this.info = this.info.bind(this);
    this.delete = this.delete.bind(this);
    this.update = this.update.bind(this);
  }

  async add(req: Request) {
    try {
      const { title, url, category } = req.body;

      if (!title || !url || !category) {
        throw new Error("Title, url and category are required");
      }

      const driveResource = new DriveResource({
        title,
        url,
        category
      });

      const savedResource = await driveResource.save();
      
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          driveResource: savedResource
        }
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: err.message || "Erreur lors de la création de la ressource"
        }
      };
    }
  }

  async list(req: Request) {
    try {
      const { category, page = 1, limit = 100 } = req.query;
      
      const filter: any = {};
      if (category) {
        filter.category = category;
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      const driveResources = await DriveResource.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await DriveResource.countDocuments(filter);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          driveResources,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: err.message || "Erreur lors de la récupération des ressources"
        }
      };
    }
  }

  async info(id: string) {
    try {
      if (!id) {
        throw new Error("Resource ID is required");
      }

      const driveResource = await DriveResource.findById(id);
      
      if (!driveResource) {
        throw new Error("Resource not found");
      }

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          driveResource
        }
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: err.message || "Erreur lors de la récupération de la ressource"
        }
      };
    }
  }

  async update(req: Request, id: string) {
    try {
      if (!id) {
        throw new Error("Resource ID is required");
      }

      const { title, url, category } = req.body;

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (url !== undefined) updateData.url = url;
      if (category !== undefined) updateData.category = category;

      if (Object.keys(updateData).length === 0) {
        throw new Error("At least one field to update is required");
      }

      const driveResource = await DriveResource.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!driveResource) {
        throw new Error("Resource not found");
      }

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          driveResource
        }
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: err.message || "Erreur lors de la mise à jour de la ressource"
        }
      };
    }
  }

  async delete(id: string) {
    try {
      if (!id) {
        throw new Error("Resource ID is required");
      }

      const driveResource = await DriveResource.findByIdAndDelete(id);

      if (!driveResource) {
        throw new Error("Resource not found");
      }

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Resource deleted successfully"
        }
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: err.message || "Erreur lors de la suppression de la ressource"
        }
      };
    }
  }
}

export default DriveResourceServices;
