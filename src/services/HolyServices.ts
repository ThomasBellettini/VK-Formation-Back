import HolyProject from "../model/learning/HolyProject.js";
import {IUser} from "../model/User.js";
import {Request} from "express";
import {ICourseBundle} from "../model/learning/CourseBundle.js";

interface IHolyGraph {
    name: string;
    description: string;

    level: number;
    url: string;
    content: string | null;

    cdnVideoContent: string | null;
    cdnAudioContent: string | null;

    hasPermission: boolean;
    projectDone: boolean;

    courses: ICourseBundle[];

    createdAt?: Date;
    updatedAt?: Date;
}

class HolyServices {
  constructor() {
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
  }

  async list(req: Request) {
    try {
      // @ts-ignore
      let user = req.user as IUser;
      let holyProject: IHolyGraph[] = [];
      if (user) {

      } else {
        const holyProjectDatabase = await HolyProject.find({}).lean();
        holyProject = holyProjectDatabase.map((iterator) => {
          return {
            name: iterator.name,
            description: iterator.description,
            level: iterator.level,
            url: iterator.url,
            content: null,
            cdnVideoContent: null,
            cdnAudioContent: null,
            hasPermission: false,
            projectDone: false,
            courses: [],
            createdAt: iterator.createdAt,
            updatedAt: iterator.updatedAt
          };
        });
      }

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          holyProject
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

  async add(req: Request) {
    try {
      const {name, description, level, url, content, courses} = req.body;
      if (!name || !description || !url) {
        throw new Error("Missing mandatory fields name, description, url")
      }
      let holyProject = await HolyProject.create(req.body);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Holy Project created with success",
          holyProject
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

}
export default HolyServices;
