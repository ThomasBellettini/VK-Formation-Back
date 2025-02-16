import User, { IUser } from "../model/User.js";
import {Request} from "express";

class UserServices {
  constructor() {
    this.list = this.list.bind(this);
    this.update = this.update.bind(this);
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
          message: "Error, no user found !",
        },
      };
    }
  }


}

export default UserServices;
