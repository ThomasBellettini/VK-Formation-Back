import User, { IUser } from "../model/User.js";
import {Request} from "express";
import Transaction from "../model/Transaction.js";

class UserServices {
  constructor() {
    this.list = this.list.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.info = this.info.bind(this);
    this.generateDiscordLink = this.generateDiscordLink.bind(this);
    this.linkDiscord = this.linkDiscord.bind(this);
    this.userByDiscord = this.userByDiscord.bind(this);
    this.makeTransaction = this.makeTransaction.bind(this);
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

  async linkDiscord(req: Request) {
    try {
      let {code, discordId} = req.body;
      if (!code || !discordId) {
        throw new Error("Il manque des informations !");
      }
      let userDb = await User.findOne({discordLinkCode: code});
      if (!userDb) throw new Error("Aucun utilisateur trouvé lié à ce code !");

      userDb.discordId = discordId;
      userDb.discordLinkCode = "";
      await userDb.save();

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          user: userDb
        },
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: err.message,
        },
      };
    }
  }

  async userByDiscord(discordID: string) {
    try {
      let userDb = await User.findOne({discordId: discordID});
      if (!userDb) throw new Error("Aucun utilisateur trouvé lié à cet id !");

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          user: userDb
        },
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: err.message,
        },
      };
    }
  }

  async makeTransaction(discordID: string, cost: number, order: string) {
    try {
      let userDb = await User.findOne({discordId: discordID});
      if (!userDb) throw new Error("Aucun utilisateur trouvé lié à cet id !");
      if (userDb.coin < cost) throw new Error("Vous n'avez pas assez de valek coins !");
      userDb.coin -= cost;

      await Transaction.create({
        user: userDb._id,
        productName: order,
        cost: cost
      })
      await userDb.save();

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          user: userDb
        },
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        data: {
          message: err.message,
        },
      };
    }
  }

  async generateDiscordLink(user: IUser) {
    try {
      if (user.discordLinkCode !== undefined && user.discordLinkCode !== "") {
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
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err.message,
        data: {
          message: err.message
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
          message: "Success, user deleted !",
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
