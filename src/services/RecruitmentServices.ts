import Recruitment from "../model/Recruitment.js";
import { Request } from "express";
import CST from "../server/constants.js";
import axios from "axios";

class RecruitmentServices {
  constructor() {
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.update = this.update.bind(this);
  }

  async list() {
    try {
      let recruitment = await Recruitment.find({});
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          recruitments: recruitment
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

  async add(body: object) {
    try {
      let recruitment = await Recruitment.create(body);
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          recruitment: recruitment
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

  async update(body: any, id: string) {
    try {
      let recruitment = await Recruitment.findById(id);
      if (!recruitment) {
        throw new Error("Recruitment not found");
      }
      if (body.status !== undefined && body.status !== null && body.status === "accepted") {
        await axios.post(`${CST.DISCORD.MODULE}/discord/recruitment`, recruitment);
      }
      if (body.status !== undefined && body.status !== null) {
        await Recruitment.findByIdAndDelete(id);
      } else {
        recruitment = await Recruitment.findByIdAndUpdate(id, body, { new: true });
      }

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          recruitment: recruitment
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

}

export default RecruitmentServices;
