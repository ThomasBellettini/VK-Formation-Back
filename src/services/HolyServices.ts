import HolyProject from "../model/learning/HolyProject.js";
import User, {IUser} from "../model/User.js";
import {Request} from "express";
import {ICourseBundle} from "../model/learning/CourseBundle.js";
import mongoose from "mongoose";
import StorageCdn from "../utils/StorageCdn.js";
import Evaluation from "../model/learning/Evaluation.js";

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

    externalLink: {
      url: string;
      title: string;
    }[]

    createdAt?: Date;
    updatedAt?: Date;
}

class HolyServices {
  constructor() {
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.info = this.info.bind(this);
    this.update = this.update.bind(this);
    this.generateEvaluation = this.generateEvaluation.bind(this);
    this.evaluateInfo = this.evaluateInfo.bind(this);
    this.evaluateUpdateUser = this.evaluateUpdateUser.bind(this);
  }

  async list(req: Request) {
    try {
      // @ts-ignore
      let user = req.user as IUser;
      let holyProject: IHolyGraph[] = [];
      if (user) {
        const holyProjectDatabase = await HolyProject.find({}).lean();
        const projectsByLevel = new Map<number, number>();
        const completedProjectsByLevel = new Map<number, number>();

        holyProjectDatabase.forEach(project => {
          projectsByLevel.set(project.level, (projectsByLevel.get(project.level) || 0) + 1);
          const userProject = user.holyProjects.find(hp => hp.project.toString() === project._id.toString());
          if (userProject && userProject.resultPercent > 1) {
            completedProjectsByLevel.set(project.level, (completedProjectsByLevel.get(project.level) || 0) + 1);
          }
        });

        let maxLevelCompleted = 0;
        for (const [level, total] of projectsByLevel.entries()) {
          if ((completedProjectsByLevel.get(level) || 0) >= total) {
            maxLevelCompleted = Math.max(maxLevelCompleted, level);
          }
        }
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
            hasPermission: iterator.level <= maxLevelCompleted + 1,
            projectDone: projectDone,
            percent: percent,
            xp: iterator.xpReward,
            externalLink: iterator.externalLink,
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
            externalLink: [],
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
      const holyProjectDatabase = await HolyProject.findOne({url: url}).lean();
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
        externalLink: holyProjectDatabase.externalLink,
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
      if (req.body.courses) {
        let coursesID = req.body.courses;
        if (!Array.isArray(coursesID)) {
          coursesID = JSON.parse(coursesID);
        }
        req.body.courses = coursesID.map((id: string) => new mongoose.Types.ObjectId(id));
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
        req.body.courses = coursesID.map((id: string) => new mongoose.Types.ObjectId(id));
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

  async generateEvaluation(req: Request, url: string) {
    try {
      const holyProject = await HolyProject.find({url: url}).lean() as IHolyGraph;
      if (!holyProject) {
        throw new Error("No Holy Project found with this url !");
      }
      // @ts-ignore
      let user = req.user as IUser;
      if (!user._id) {
        throw new Error("No user found !");
      }
      if (user.coin < 0) {
        throw new Error("Not enough coin to generate evaluation !");
      }
      let userProject = user.holyProjects.find(hp => hp.project.toString() === holyProject._id.toString());
      if (userProject?.resultPercent && userProject?.resultPercent > 1) {
        throw new Error("Project already done !");
      }
      let evaluation = await Evaluation.create({
        user: user._id,
        project: holyProject._id
      });

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Evaluation created with success",
          evaluation: evaluation._id
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

  async evaluateInfo(req: Request, id: string) {
    try {
      // @ts-ignore
      let requestUser = req.user as IUser;
      const evaluation = await Evaluation.findById(id).populate("project").lean();
      if (!evaluation) {
        throw new Error("No Evaluation found with this id !");
      }
      let user = await User.findById(evaluation.user) as IUser;
      if (!user) {
        throw new Error("No evaluable user found !");
      }
      if (user._id.toString() === requestUser._id.toString()) {
        throw new Error("You can't evaluate yourself !");
      }

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          evaluation: evaluation
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

  async evaluateUpdateUser(req: Request, id: string) {
    try {
      // @ts-ignore
      let requestUser = req.user as IUser;
      if (!req.body.percent || req.body.percent < 0) {
        throw new Error("Percent is mandatory and must be greater than 0 !");
      }
      const evaluation = await Evaluation.findById(id).lean();
      if (!evaluation) {
        throw new Error("No Evaluation found with this id !");
      }
      let user = await User.findById(evaluation.user) as IUser;
      if (!user) {
        throw new Error("No evaluable user found !");
      }
      if (user._id.toString() === requestUser._id.toString()) {
        throw new Error("You can't evaluate yourself !");
      }
      await Evaluation.findByIdAndUpdate(id, {percent: req.body.percent});
      user.holyProjects.push({
        project: evaluation.project,
        resultPercent: req.body.percent
      })
      await user.save();

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "User has been evaluated with success",
          evaluation: evaluation
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
