import User, { IUser } from "../model/User.js";
import {Request} from "express";

class UserServices {
  constructor() {
    this.list = this.list.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.info = this.info.bind(this);
    this.generateDiscordLink = this.generateDiscordLink.bind(this);
  }

  async list() {
    try {
      let userDb = await User.find({})
          .populate("holyProjects.project")
          .populate("lessonsFinished");

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          users: userDb,
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: "Error, no user found !",
        },
      };
    }
  }

  async update(req: Request, id: string) {
    try {
      let userDb = await User.findById(id);
      if (!userDb) throw new Error("No user found !");
      userDb = await User.findByIdAndUpdate(id, req.body);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          users: userDb,
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: "Error, no user found !",
        },
      };
    }
  }

  async generateDiscordLink(user: IUser) {
    try {
      if (user.discordLinkCode !== null && user.discordLinkCode !== "") {
        throw new Error("Discord link already generated !");
      }
      if (!user.discordAccess) {
        throw new Error("Discord access not granted !");
      }
      let link = Math.random().toString(36) + Math.random().toString(36);
      let editedUser = await User.findByIdAndUpdate(user._id, { discordLinkCode: link });

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          code: link,
          user: editedUser
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: "Error, no user found !",
        },
      };
    }
  }

  async delete(id: string) {
    try {
      let userDb = await User.findById(id);
      if (!userDb) throw new Error("No user found !");
      await User.findByIdAndDelete(id);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Succes, user deleted !",
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: "Error, no user found !",
        },
      };
    }
  }

  async info(id: string) {
    try {
      let userDb = await User.findById(id).populate("holyProjects.project").populate("lessonsFinished").lean();
      if (!userDb) throw new Error("No user found !");

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          user: userDb
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: "Error, no user found !",
        },
      };
    }
  }

  async add(req: Request) {
    try {
      if (!req.body.email || !req.body.password || !req.body.firstname || !req.body.lastname) {
        throw new Error("Missing fields");
      }
      let user = await User.create(req.body);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          user: user,
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: "Error in user creation !",
        },
      };
    }
  }


}

export default UserServices;
