import User, { IUser } from "../model/User.js";

class UserServices {
  constructor() {
    this.list = this.list.bind(this);
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
}

export default UserServices;
