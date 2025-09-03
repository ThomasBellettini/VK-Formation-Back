import Notification, { INotification } from "../model/Notification.js";
import { Request } from "express";
import User, { IUser } from "../model/User.js";
import mongoose from "mongoose";

class NotificationServices {
  constructor() {
    this.add = this.add.bind(this);
    this.delete = this.delete.bind(this);
    this.deleteAll = this.deleteAll.bind(this);
    this.list = this.list.bind(this);
  }

  async add(req: Request) {
    try {
      const { title, description, linkedUserId } = req.body;
      
      if (!title || !description || !linkedUserId) {
        throw new Error("Missing required fields: title, description, linkedUserId");
      }

      const user = User.findById(linkedUserId);
      if (!user) {
        throw new Error("User not found with the provided linkedUserId");
      }

      const notification = await Notification.create({
        title,
        description,
        linkedUser: linkedUserId
      });

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          notification
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: err instanceof Error ? err.message : "Error creating notification !",
        },
      };
    }
  }

  async delete(req: Request, notificationId: string) {
    try {
      // @ts-ignore
      const user = req.user as IUser;
      const notification = await Notification.findById(notificationId).populate("linkedUser");
      
      if (!notification) {
        throw new Error("Notification not found !");
      }

      if (notification.linkedUser._id.toString() !== user._id.toString()) {
        throw new Error("Unauthorized: You can only delete your own notifications !");
      }

      await Notification.findByIdAndDelete(notificationId);

      return {
        success: true,
        statusCode: 200,
        errors: null,
        data: {
          message: "Notification deleted successfully !",
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: err instanceof Error ? err.message : "Error deleting notification !",
        },
      };
    }
  }

  async deleteAll(req: Request) {
    try {
      // @ts-ignore
      const user = req.user as IUser;
      const deletedCount = await Notification.deleteMany({ linkedUser: user._id });

      return {
        success: true,
        statusCode: 200,
        errors: null,
        data: {
          message: `Successfully deleted ${deletedCount.deletedCount} notifications !`,
          deletedCount: deletedCount.deletedCount
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: "Error deleting all notifications !",
        },
      };
    }
  }

  async list(req: Request) {
    try {
        // @ts-ignore
        const user = req.user as IUser;
      let limit = Number(req.query.limit) || 20;
      let page = Number(req.query.page) || 1;
      
      const notifications = await Notification.find({ linkedUser: user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await Notification.countDocuments({ linkedUser: user._id });

      return {
        success: true,
        statusCode: 200,
        errors: null,
        data: {
          notifications,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: "Error fetching notifications !",
        },
      };
    }
  }
}

export default NotificationServices;
