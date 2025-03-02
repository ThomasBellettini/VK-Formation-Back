import User, { IUser } from "../model/User.js";
import {Request} from "express";
import Transaction from "../model/Transaction.js";
import {getOrCreateDiscordData} from "../model/Discord.js";

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

  async list(req: Request) {
    try {
      let limit = Number(req.query.limit) || 20;
      let page = Number(req.query.page) || 1;
      let userDb: IUser[] = [];

      userDb = await User.find({})
          .populate("holyProjects.project")
          .populate("lessonsFinished")
          .sort({ permission: -1 })
          .skip((page - 1) * limit)
          .limit(limit);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          total: await User.countDocuments({}),
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
      if (!userDb) throw new Error("Aucun utilisateur trouvé avec ce code. Vous pouvez trouvez votre code de laision directement sur votre page profil !");

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
      let userDb = await User.findOne({discordId: discordID}).populate("holyProjects");
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

  async makeTransaction(discordID: string, orderID: string) {
    try {
      let userDb = await User.findOne({discordId: discordID});
      if (!userDb) throw new Error("Aucun utilisateur trouvé lié à cet id !");
      let discordData = await getOrCreateDiscordData();
      const item = discordData.shopItems.find(item => item._id.toString() === orderID);
      if (!item) {
        throw new Error("Aucun item trouvé avec cet id !");
      }
      if (userDb.coin < item.cost) throw new Error("Vous n'avez pas assez de valek coins !");
      userDb.coin -= item.cost;

      await Transaction.create({
        user: userDb._id,
        productName: item.name,
        cost: item.cost
      })
      await userDb.save();

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          item: item,
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
      if (!req.body.email || !req.body.password) {
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
