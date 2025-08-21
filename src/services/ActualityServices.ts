import { Request } from "express";
import mongoose from "mongoose";
import Actuality, { IActuality } from "../model/Actualities.js";
import StorageCdn from "../utils/StorageCdn.js";

interface IActualityResponse {
  statusCode: number;
  message: string;
  data?: any;
}

class ActualityServices {
  constructor() {
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.info = this.info.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  private async handlePositionConflict(position?: number, excludeId?: string) {
    if (position === undefined || position === null) return;
    if (position !== 1 && position !== 2) {
      throw new Error("Position must be 1 or 2");
    }

    const filter: any = { position };
    if (excludeId) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    const existing = await Actuality.findOne(filter).lean();
    if (existing) {
      await Actuality.updateOne({ _id: existing._id }, { $unset: { position: 1 } });
    }
  }

  async list(req: Request): Promise<IActualityResponse> {
    try {
      const actualities = await Actuality.find().sort({ createdAt: -1 }).lean();

      return {
        statusCode: 200,
        message: "Actualities retrieved successfully",
        data: actualities,
      };
    } catch (error) {
      console.error("Error listing actualities:", error);
      return {
        statusCode: 500,
        message: "Internal server error",
      };
    }
  }

  async add(req: Request): Promise<IActualityResponse> {
    try {
      const { title, description, url } = req.body;
      let { position } = req.body as any;

      if (!title || !description) {
        return { statusCode: 400, message: "Missing required fields: title, description" };
      }

      if (url) {
        const existingByUrl = await Actuality.findOne({ url }).lean();
        if (existingByUrl) {
          return { statusCode: 409, message: "Actuality with this URL already exists" };
        }
      }

      if (position !== undefined) {
        position = Number(position);
        await this.handlePositionConflict(position);
      }

      const imageUrls: string[] = [];
      const files = (req.files as Express.Multer.File[]) || [];
      for (const file of files) {
        const identifier = await StorageCdn.generateRandomFilename(file.originalname);
        const filePath = `actuality/${identifier}`;
        const { bunnyFilePath } = await StorageCdn.uploadFile(file.path, filePath, file.originalname, false);
        imageUrls.push(bunnyFilePath);
      }

      const actuality = await Actuality.create({
        title,
        description,
        url,
        position: position !== undefined ? Number(position) : undefined,
        imageUrl: imageUrls,
      });

      return {
        statusCode: 201,
        message: "Actuality created successfully",
        data: actuality,
      };
    } catch (error: any) {
      console.error("Error creating actuality:", error);
      const message = error?.message || "Internal server error";
      return {
        statusCode: 500,
        message,
      };
    }
  }

  async info(req: Request, url: string): Promise<IActualityResponse> {
    try {
      const actuality = await Actuality.findOne({ url }).lean();
      if (!actuality) {
        return { statusCode: 404, message: "Actuality not found" };
      }

      return {
        statusCode: 200,
        message: "Actuality retrieved successfully",
        data: actuality,
      };
    } catch (error) {
      console.error("Error fetching actuality info:", error);
      return {
        statusCode: 500,
        message: "Internal server error",
      };
    }
  }

  async update(req: Request, id: string): Promise<IActualityResponse> {
    try {
      const actuality = await Actuality.findById(id);
      if (!actuality) {
        return { statusCode: 404, message: "Actuality not found" };
      }

      const { title, description, url } = req.body;
      let { position } = req.body as any;

      if (url && url !== actuality.url) {
        const existingByUrl = await Actuality.findOne({ url, _id: { $ne: id } }).lean();
        if (existingByUrl) {
          return { statusCode: 409, message: "Actuality with this URL already exists" };
        }
      }

      if (position !== undefined && position !== null) {
        position = Number(position);
        await this.handlePositionConflict(position, id);
      }

      const updateData: Partial<IActuality> = {} as any;
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (url !== undefined) (updateData as any).url = url as any;
      if (position === null || position === "" || Number.isNaN(Number(position))) {
        (updateData as any).position = undefined as any;
        await Actuality.updateOne({ _id: id }, { $unset: { position: 1 } });
      } else if (position !== undefined) {
        (updateData as any).position = Number(position) as any;
      }

      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length > 0) {
        const imageUrls: string[] = [];
        for (const file of files) {
          const identifier = await StorageCdn.generateRandomFilename(file.originalname);
          const filePath = `images/${identifier}`;
          const { bunnyFilePath } = await StorageCdn.uploadFile(file.path, filePath, file.originalname, false);
          imageUrls.push(bunnyFilePath);
        }
        (updateData as any).imageUrl = imageUrls as any;
      }

      const updatedActuality = await Actuality.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).lean();

      return {
        statusCode: 200,
        message: "Actuality updated successfully",
        data: updatedActuality,
      };
    } catch (error: any) {
      console.error("Error updating actuality:", error);
      const message = error?.message || "Internal server error";
      return {
        statusCode: 500,
        message,
      };
    }
  }

  async delete(id: string): Promise<IActualityResponse> {
    try {
      const deleted = await Actuality.findByIdAndDelete(id);
      if (!deleted) {
        return { statusCode: 404, message: "Actuality not found" };
      }

      return {
        statusCode: 200,
        message: "Actuality deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting actuality:", error);
      return {
        statusCode: 500,
        message: "Internal server error",
      };
    }
  }
}

export default ActualityServices;


