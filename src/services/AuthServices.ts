import User, { IUser } from "../model/User.js";
import { generateToken } from "../utils/JWTUtils.js";
import {Request} from "express";
import {sendTemplateEmail} from "../utils/BrevoUtils.js";
import axios from "axios";
import Polaris from "../model/learning/Polaris.js";
import { getUserLevelForPolaris } from "../utils/utils.js";
import Notification from "../model/Notification.js";
import {IHolyProject} from "../model/learning/HolyProject.js";
import Planet from "../model/learning/Planet.js";

class AuthServices {
  constructor() {
    this.me = this.me.bind(this);
    this.login = this.login.bind(this);
    this.register = this.register.bind(this);
    this.registerWebhook = this.registerWebhook.bind(this);
    this.accountConfirmation = this.accountConfirmation.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.deleteWebhook = this.deleteWebhook.bind(this);
    this.tutoVideo = this.tutoVideo.bind(this);
  }

  async me(user: IUser) {
    try {
      let userDb = await User.findOne({ email: user.email }).populate("lessonsFinished").populate("holyProjects.project");
      if (!userDb) throw "No user found !";
      let userData = userDb.toObject();

      const allPolaris = await Polaris.find({}).lean();
      const polarisLevels: { polaris: string; level: number }[] = [];

      for (let hInit of userData.holyProjects) {
        let project = hInit.project as IHolyProject;
        let planet = await Planet.findOne({ _id: project.planet }).populate("polaris").lean();
        if (!planet || planet.polaris) continue;
        // @ts-ignore
        hInit.polaris = planet.polaris.identifier;
      }

      for (const polaris of allPolaris) {
        if (!polaris.identifier) continue;
        const level = await getUserLevelForPolaris(userDb, polaris.identifier);

        polarisLevels.push({
          polaris: polaris.identifier,
          level: level
        });
      }

      const notifications = await Notification.find({ linkedUser: userDb._id })
        .sort({ createdAt: -1 })
        .lean();

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          user: userData,
          polarisLevels,
          notifications
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
      if (user) {
        if (user.permission === "ban") {
          user.permission = "user";
          await user.save();
          return {
            success: true,
            statusCode: 201,
            errors: null,
            data: {
              user: user,
            },
          };
        }
        throw "User already exist !";
      }

      let newUser = await User.create({
        email: email,
        password: password,
        isConfirmed: true,
        discordAccess: true,
        confirmationCode:
          Math.random().toString(36) + Math.random().toString(36),
        resetCode: Math.random().toString(36) + Math.random().toString(36),
      });

      let response = await axios.get(`https://api.systeme.io/api/contacts?email=${email}`, {
        headers: {
          "X-API-Key": "83ws3dbyupzeidbls2xczalyjcqacg91n4sospp1fyanno72vsw71hkysf7guucy"
        }
      });
      if (response.status === 200 && response.data.items && response.data.items.length > 0) {
        let items = response.data.items;
        for (let i = 0; i < items.length; i++) {
          let items = response.data.items[i] as {
            id: string;
            tags: {
                id: string;
                name: string;
            }[];
          };
          for (let j = 0; j < items.tags.length; j++) {
            let tag = items.tags[j];
            await axios.delete(`https://api.systeme.io/api/contacts/${items.id}/tags/${tag.id}`, {
              headers: {
                "X-API-Key": "83ws3dbyupzeidbls2xczalyjcqacg91n4sospp1fyanno72vsw71hkysf7guucy"
              }
            });
          }
          await axios.post(`https://api.systeme.io/api/contacts/${items.id}/tags`, {
            tagId: 1439804
          }, {
            headers: {
              "X-API-Key": "83ws3dbyupzeidbls2xczalyjcqacg91n4sospp1fyanno72vsw71hkysf7guucy"
            }
          });
        }
      }

      await sendTemplateEmail(1, {vkStudioRedirectUrl: `https://valekstudio.com/reset-password/${newUser.resetCode}`}, newUser.email);
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
      let fullAccess = false;
      if (!req.body.data || !req.body.data.customer) {
        throw "Missing data ! Fields Required: email";
      }
      if (req.query.discord && req.query.discord === "true") {
        fullAccess = true;
      }
      let email = req.body.data.customer.email;
      if (!email ) {
        throw "Missing data ! Fields Required: email";
      }
      const user = await User.findOne({ email: email });
      if (user) {
        if (user.permission === "ban") {
          user.permission = "user";
          await user.save();
          return {
            success: true,
            statusCode: 201,
            errors: null,
            data: {
              user: user,
            },
          };
        }
        throw "User already exist !";
      }
      let password = Math.random().toString(36) + Math.random().toString(36);

      let newUser = await User.create({
        email: email,
        password: password,
        isConfirmed: true,
        resetCode: Math.random().toString(36) + Math.random().toString(36),
        discordAccess: fullAccess
      });

      await sendTemplateEmail(1, {vkStudioRedirectUrl: `https://valekstudio.com/reset-password/${newUser.resetCode}`}, newUser.email);

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

  async deleteWebhook(req: Request) {
    try {
      let fullAccess = false;
      if (!req.body.data || !req.body.data.customer) {
        throw "Missing data ! Fields Required: email";
      }
      let email = req.body.data.customer.email;
      if (!email ) {
        throw "Missing data ! Fields Required: email";
      }
      const user = await User.findOne({ email: email });
      if (!user) {
        throw "User not found !";
      }
      user.permission = "ban";
      await user.save();

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
      // if (user.resetCode && user.resetCode !== "") throw "Reset code already sent !";

      user.resetCode = Math.random().toString(36) + Math.random().toString(36);
      await user.save();
      await sendTemplateEmail(2, {vkStudioRedirectUrl: `https://valekstudio.com/reset-password/${user.resetCode}`}, user.email);

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

  async tutoVideo(user: IUser) {
    try {
      const userDB = await User.findOne({ email: user.email });
      if (!userDB) throw "No user found !";

      userDB.tutoVideo = true;
      await userDB.save();

      return {
        success: true,
        statusCode: 200,
        errors: null,
        data: {
          message: "Video Watched !",
        },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: "Error in user edition !",
        },
      };
    }
  }
}

export default AuthServices;
