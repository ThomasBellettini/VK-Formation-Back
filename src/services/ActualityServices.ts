import { Request } from "express";
import mongoose from "mongoose";
import Actuality, { IActuality, POSITION } from "../model/Actualities.js";
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

  private async handlePositionConflict(position?: POSITION, excludeId?: string) {
    if (position === undefined || position === null) return;

    const filter: any = { position } as any;
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

      for (let actuality of actualities) {
        if (actuality.imageUrl) {
          actuality.imageUrl = StorageCdn.generateSecureLink(actuality.imageUrl);
        }
      }

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
      const { order } = req.body as any;
      let { position } = req.body as { position?: POSITION | string };

      if (position !== undefined && position !== null) {
        // normalize to enum value
        position = String(position).toLowerCase() as POSITION;
        if (position !== POSITION.LEFT && position !== POSITION.RIGHT) {
          return { statusCode: 400, message: "Position must be 'left' or 'right'" };
        }
        await this.handlePositionConflict(position as POSITION);
      }

      let imageUrl: string | undefined;
      const file = (req.file as Express.Multer.File | undefined);
      if (file) {
        const identifier = await StorageCdn.generateRandomFilename(file.originalname);
        const filePath = `actuality/${identifier}`;
        const { bunnyFilePath } = await StorageCdn.uploadFile(file.path, filePath, file.originalname, false);
        imageUrl = bunnyFilePath;
      }

      const actuality = await Actuality.create({
        position: position as POSITION | undefined,
        order: order !== undefined ? Number(order) : 0,
        imageUrl: imageUrl as string,
      } as any);

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

  async info(req: Request, id: string): Promise<IActualityResponse> {
    try {
      const actuality = await Actuality.findById(id).lean();
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

      const { order } = req.body as any;
      let { position } = req.body as { position?: POSITION | string };
      const updateData: Partial<IActuality> = {} as any;

      if (position === null || position === "") {
        (updateData as any).position = undefined as any;
        await Actuality.updateOne({ _id: id }, { $unset: { position: 1 } });
      } else if (position !== undefined) {
        position = String(position).toLowerCase() as POSITION;
        if (position !== POSITION.LEFT && position !== POSITION.RIGHT) {
          return { statusCode: 400, message: "Position must be 'left' or 'right'" };
        }
        await this.handlePositionConflict(position as POSITION, id);
        (updateData as any).position = position as any;
      }
      if (order !== undefined) (updateData as any).order = Number(order) as any;

      const file = (req.file as Express.Multer.File | undefined);
      if (file) {
        const identifier = await StorageCdn.generateRandomFilename(file.originalname);
        const filePath = `images/${identifier}`;
        const { bunnyFilePath } = await StorageCdn.uploadFile(file.path, filePath, file.originalname, false);
        (updateData as any).imageUrl = bunnyFilePath as any;
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


