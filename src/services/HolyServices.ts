import HolyProject from "../model/learning/HolyProject.js";
import {IUser} from "../model/User";
import {Request} from "express";
import {ICourseBundle} from "../model/learning/CourseBundle.js";
import mongoose from "mongoose";
import StorageCdn from "../utils/StorageCdn.js";

interface IHolyGraph {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;

    level: number;
    url: string;
    content: string | null;

    xp: number;

    cdnVideoContent: string | null;
    cdnAudioContent: string | null;

    hasPermission: boolean;
    projectDone: boolean;

    percent: number | null;

    courses: (ICourseBundle | mongoose.Types.ObjectId)[];

    createdAt?: Date;
    updatedAt?: Date;
}

class HolyServices {
  constructor() {
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.info = this.info.bind(this);
    this.update = this.update.bind(this);
  }

  async list(req: Request) {
    try {
      // @ts-ignore
      let user = req.user as IUser;
      let holyProject: IHolyGraph[] = [];
      if (user) {
        const holyProjectDatabase = await HolyProject.find({}).lean();
        holyProject = holyProjectDatabase.map((iterator) => {
          const userProject = user.holyProjects.find(hp =>
            hp.project.toString() === iterator._id.toString()
          );
          let projectDone = false;
          let percent = 0;
          if (userProject) {
            percent = userProject?.resultPercent;
            projectDone = percent > 1;
          }

          return {
            _id: iterator._id,
            name: iterator.name,
            description: iterator.description,
            level: iterator.level,
            url: iterator.url,
            content: iterator.content,
            cdnVideoContent: iterator.cdnVideoContent,
            cdnAudioContent: iterator.cdnAudioContent,
            hasPermission: true,
            projectDone: projectDone,
            percent: percent,
            xp: iterator.xpReward,
            courses: iterator.courses,
            createdAt: iterator.createdAt,
            updatedAt: iterator.updatedAt
          };
        });
      } else {
        const holyProjectDatabase = await HolyProject.find({}).lean();
        holyProject = holyProjectDatabase.map((iterator) => {
          return {
            _id: iterator._id,
            name: iterator.name,
            description: iterator.description,
            level: iterator.level,
            url: iterator.url,
            content: null,
            xp: iterator.xpReward,
            cdnVideoContent: null,
            cdnAudioContent: null,
            hasPermission: false,
            projectDone: false,
            percent: null,
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

  async info(req: Request, url: string) {
    try {
      //@ts-ignore
      const user = req.user as IUser;
      const holyProjectDatabase = await HolyProject.findOne({url: url}).populate("courses").lean();
      if (!holyProjectDatabase) throw new Error("No Project found with this id !");
      const userProject = user.holyProjects.find(hp =>
        hp.project.toString() === holyProjectDatabase._id.toString()
      );
      let projectDone = false;
      let percent = 0;
      if (userProject) {
        percent = userProject?.resultPercent;
        projectDone = percent > 1;
      }

      let holyProject: IHolyGraph = {
        _id: holyProjectDatabase._id,
        name: holyProjectDatabase.name,
        description: holyProjectDatabase.description,
        level: holyProjectDatabase.level,
        xp: holyProjectDatabase.xpReward,
        url: holyProjectDatabase.url,
        content: holyProjectDatabase.content,
        cdnVideoContent: holyProjectDatabase.cdnVideoContent,
        cdnAudioContent: holyProjectDatabase.cdnAudioContent,
        hasPermission: true,
        projectDone: projectDone,
        percent: percent,
        courses: holyProjectDatabase.courses,
        createdAt: holyProjectDatabase.createdAt,
        updatedAt: holyProjectDatabase.updatedAt
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
      const {name, description, url} = req.body;
      if (!name || !description || !url) {
        throw new Error("Missing mandatory fields name, description, url")
      }

      if (req.file) {
        const identifier = await StorageCdn.generateRandomFilename(req.file.originalname);
        let filePath = `upload/${identifier}`;
        let { bunnyFilePath, duration } = await StorageCdn.uploadFile(req.file.path, filePath, req.file.originalname, true);
        req.body.cdnVideoContent = bunnyFilePath;
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

  async update(req: Request, id: string) {
    try {
      let holyProject = await HolyProject.findById(id);
      if (!holyProject) {
        throw new Error("No Holy Project found with this id !");
      }

      if (req.file) {
        const identifier = await StorageCdn.generateRandomFilename(req.file.originalname);
        let filePath = `upload/${identifier}`;
        let { bunnyFilePath, duration } = await StorageCdn.uploadFile(req.file.path, filePath, req.file.originalname, true);
        req.body.cdnVideoContent = bunnyFilePath;
      }
      if (req.body.courses) {
        let coursesID = req.body.courses;
        if (!Array.isArray(coursesID)) {
          coursesID = JSON.parse(coursesID);
        }
        req.body.lessons = coursesID.map((id: string) => new mongoose.Types.ObjectId(id));
      }
      holyProject = await HolyProject.findByIdAndUpdate(id, req.body);

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
