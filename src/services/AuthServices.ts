import User, { IUser } from "../model/User.js";
import { generateToken } from "../utils/JWTUtils.js";
import mongoose from "mongoose";
import {Request} from "express";

class AuthServices {
  constructor() {
    this.me = this.me.bind(this);
    this.login = this.login.bind(this);
    this.register = this.register.bind(this);
    this.registerWebhook = this.registerWebhook.bind(this);
    this.accountConfirmation = this.accountConfirmation.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
  }

  async me(user: IUser) {
    try {
      let userDb = await User.findOne({ email: user.email }).populate("lessonsFinished").populate("holyProjects.project");
      if (!userDb) throw "No user found !";
      let userData = userDb.toObject();

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          user: userData,
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

  async login(email: string, password: string) {
    try {
      if (!email || !password) {
        throw "Missing data ! Fields Required: email, password";
      }
      const user = await User.findOne({ email: email });
      if (!user) throw "Invalid email or password !";
      let passwordCompare = await user.comparePassword(password);
      if (!passwordCompare) throw "Invalid email or password !";
      if (!user.isConfirmed) throw "User not confirmed !";
      let token = generateToken(user.email, user.permission);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "OK",
          token: token,
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        token: null,
        data: {
          message: err
        },
      };
    }
  }

  async register(email: string, password: string) {
    try {
      if (!email || !password) {
        throw "Missing data ! Fields Required: email, password";
      }
      const user = await User.findOne({ email: email });
      if (user) throw "User already exist !";

      let newUser = await User.create({
        email: email,
        password: password,
        isConfirmed: true,
        confirmationCode:
          Math.random().toString(36) + Math.random().toString(36),
      });

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          user: newUser,
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

  async registerWebhook(req: Request) {
    try {
      if (!req.body.data || !req.body.data.customer) {
        throw "Missing data ! Fields Required: email";
      }
      let email = req.body.data.customer.email;
      if (!email ) {
        throw "Missing data ! Fields Required: email";
      }
      const user = await User.findOne({ email: email });
      if (user) throw "User already exist !";
      let password = Math.random().toString(36) + Math.random().toString(36);

      let newUser = await User.create({
        email: email,
        password: password,
        isConfirmed: true,
        confirmationCode:
            Math.random().toString(36) + Math.random().toString(36),
      });

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          user: newUser,
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

  async accountConfirmation(confirmationCode: string) {
    try {
      if (!confirmationCode) {
        throw "Missing confirmationCode";
      }
      const user = await User.findOne({ confirmationCode: confirmationCode });
      if (!user) throw "Invalid confirmationCode !";
      if (user.isConfirmed) throw "User already confirmed !";
      let token = generateToken(user.email, user.permission);
      user.isConfirmed = true;
      user.confirmationCode = null;
      await user.save();

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "OK",
          token: token,
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        token: null,
        data: {
          message:err,
        },
      };
    }
  }

  async forgotPassword(email: string) {
    try {
      if (!email) {
        throw "Missing data ! Fields Required: email";
      }
      const user = await User.findOne({ email: email });
      if (!user) throw "No user found !";

      user.resetCode = Math.random().toString(36) + Math.random().toString(36);
      await user.save();

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Password deleted, mail sent !",
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

  async resetPassword(code: string, password: string) {
    try {
      if (!code || !password) {
        throw "Missing data ! Fields Required: code, password";
      }
      const user = await User.findOne({ resetCode: code });
      if (!user) throw "No user found !";

      user.password = password;
      user.resetCode = null;
      await user.save();

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Password updated !",
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

export default AuthServices;
