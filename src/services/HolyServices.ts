import HolyProject, {EvaluationType, EvaluatorType, IHolyProject, QCMType} from "../model/learning/HolyProject.js";
import User, {IUser} from "../model/User.js";
import {Request} from "express";
import mongoose from "mongoose";
import StorageCdn from "../utils/StorageCdn.js";
import Evaluation, {IEvaluation} from "../model/learning/Evaluation.js";
import CST from "../server/constants.js";
import holyProject from "../model/learning/HolyProject.js";
import axios from "axios";
import Resource, {IResource} from "../model/Resource.js";

interface IHolyGraph {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;

    level: number | null;
    url: string;
    evaluationText: string | null;
    content: string | null;
    linkedProjectId: string;

    xp: number;

    cdnVideoContent: string | null;
    cdnAudioContent: string | null;

    evaluationType: EvaluationType;
    evaluatorType: EvaluatorType;

    uploadFilesDescription: string | null;
    uploadFilesCount: number | null;

    qcmContent: {
      question: string;
      type: QCMType;
      options: string[];
      correctAnswers: string[];
    }[];

    shareLinksDescription: string | null;
    shareLinksCount: string | null;

    hasPermission: boolean;
    projectDone: boolean;

    percent: number | null;
    cost: number;

   links: {
      url: string;
      name: string;
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
    this.delete = this.delete.bind(this);
    this.hasEvaluationLink = this.hasEvaluationLink.bind(this);
    this.claimEvaluation = this.claimEvaluation.bind(this);
    this.updateChannelFromDiscord = this.updateChannelFromDiscord.bind(this);
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
          if (!project.linkedProjectId) {
            projectsByLevel.set(project.level, (projectsByLevel.get(project.level) || 0) + 1);
            const userProject = user.holyProjects.find(hp => hp.project.toString() === project._id.toString() && hp.resultPercent >= 80);
            if (userProject) {
              completedProjectsByLevel.set(project.level, (completedProjectsByLevel.get(project.level) || 0) + 1);
            }
          }
        });

        let maxLevelCompleted = 0;
        for (const [level, total] of projectsByLevel.entries()) {
          if ((completedProjectsByLevel.get(level) || 0) >= total) {
            maxLevelCompleted = Math.max(maxLevelCompleted, level);
          }
        }
        holyProject = holyProjectDatabase.map((iterator) => {
          const userProject = user.holyProjects.filter(hp =>
            hp.project.toString() === iterator._id.toString() && hp.resultPercent >= 80
          );
          let projectDone = false;
          let percent = 0;
          if (userProject) {
            for (const project of userProject) {
              if (project.resultPercent > percent) {
                percent = project?.resultPercent;
                projectDone = percent > 80;
              }
            }
          }
          let hasPermission = false;
          if (iterator.linkedProjectId) {
            let hasMakeProject = user.holyProjects.find(hp =>
                hp.project.toString() === iterator.linkedProjectId.toString() && hp.resultPercent >= 80
            );
            if (hasMakeProject) {
              hasPermission = true;
            }
          }
          let qcm = iterator.qcmContent.map((qcm => {
            return {
                question: qcm.question,
                type: qcm.type,
                options: qcm.options,
                correctAnswers: (user.permission === "admin" ? qcm.correctAnswers : [])
            }
          }));

          return {
            _id: iterator._id,
            name: iterator.name,
            description: iterator.description,
            evaluationText: iterator.evaluationText,
            level: (iterator.linkedProjectId ? null : iterator.level),
            url: iterator.url,
            cost: iterator.cost,
            linkedProjectId: iterator.linkedProjectId,
            content: iterator.content,
            cdnVideoContent: iterator.cdnVideoContent,
            cdnAudioContent: iterator.cdnAudioContent,
            hasPermission: (iterator.linkedProjectId ? hasPermission : iterator.level <= maxLevelCompleted + 1),
            projectDone: projectDone,
            percent: percent,
            xp: iterator.xp,
            links: iterator.links,
            createdAt: iterator.createdAt,
            updatedAt: iterator.updatedAt,
            uploadFilesDescription: iterator.uploadFilesDescription,
            uploadFilesCount: iterator.uploadFilesCount,
            shareLinksDescription: iterator.shareLinksDescription,
            shareLinksCount: iterator.shareLinksCount,
            qcmContent: qcm,
            evaluationType: iterator.evaluationType,
            evaluatorType: iterator.evaluatorType
          };
        });
      } else {
        const holyProjectDatabase = await HolyProject.find({}).lean();
        holyProject = holyProjectDatabase.map((iterator) => {
          return {
            _id: iterator._id,
            name: iterator.name,
            description: iterator.description,
            level: (iterator.linkedProjectId ? null : iterator.level),
            url: iterator.url,
            content: null,
            evaluationText: "",
            xp: iterator.xp,
            cdnVideoContent: null,
            cdnAudioContent: null,
            cost: iterator.cost,
            hasPermission: false,
            linkedProjectId: iterator.linkedProjectId,
            projectDone: false,
            percent: null,
            links: [],
            createdAt: iterator.createdAt,
            updatedAt: iterator.updatedAt,
            uploadFilesDescription: null,
            uploadFilesCount: null,
            shareLinksDescription: null,
            shareLinksCount: null,
            qcmContent: [],
            evaluationType: iterator.evaluationType,
            evaluatorType: iterator.evaluatorType
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
      const holyProjectDatabase = await HolyProject.findOne({ url: url }).lean();
      if (!holyProjectDatabase) throw new Error("No Project found with this id !");

      const userProject = user.holyProjects.filter(hp =>
          hp.project.toString() === holyProjectDatabase._id.toString()
      );

      let projectDone = false;
      let percent = 0;
      if (userProject) {
        for (const project of userProject) {
          if (project.resultPercent > percent) {
            percent = project?.resultPercent;
            projectDone = percent > 80;
          }
        }
      }

      const holyProjectList = await HolyProject.find({}).lean();
      const projectsByLevel = new Map<number, number>();
      const completedProjectsByLevel = new Map<number, number>();

      holyProjectList.forEach(project => {
        if (!project.linkedProjectId) {

          projectsByLevel.set(project.level, (projectsByLevel.get(project.level) || 0) + 1);
          const userProject = user.holyProjects.find(hp => hp.project.toString() === project._id.toString() && hp.resultPercent >= 80);
          if (userProject) {
            completedProjectsByLevel.set(project.level, (completedProjectsByLevel.get(project.level) || 0) + 1);
          }
        }
      });

      let maxLevelCompleted = 0;
      for (const [level, total] of projectsByLevel.entries()) {
        if ((completedProjectsByLevel.get(level) || 0) >= total) {
          maxLevelCompleted = Math.max(maxLevelCompleted, level);
        }
      }

      let hasPermission = false;
      if (holyProjectDatabase.linkedProjectId) {
        hasPermission = user.holyProjects.some(hp =>
            hp.project.toString() === holyProjectDatabase.linkedProjectId.toString()
        );
      } else {
        hasPermission = holyProjectDatabase.level <= maxLevelCompleted + 1;
      }

      let qcmContent = holyProjectDatabase.qcmContent.map((qcm => {
        return {
          question: qcm.question,
          type: qcm.type,
          options: qcm.options,
          correctAnswers: []
        }
      }));

      let holyProject: IHolyGraph = {
        _id: holyProjectDatabase._id,
        name: holyProjectDatabase.name,
        linkedProjectId: holyProjectDatabase.linkedProjectId,
        description: holyProjectDatabase.description,
        level: holyProjectDatabase.level,
        xp: holyProjectDatabase.xp,
        url: holyProjectDatabase.url,
        cost: holyProjectDatabase.cost,
        content: holyProjectDatabase.content,
        evaluationText: holyProjectDatabase.evaluationText,
        cdnVideoContent: holyProjectDatabase.cdnVideoContent,
        cdnAudioContent: holyProjectDatabase.cdnAudioContent,
        hasPermission: hasPermission,
        projectDone: projectDone,
        percent: percent,
        links: holyProjectDatabase.links,
        createdAt: holyProjectDatabase.createdAt,
        updatedAt: holyProjectDatabase.updatedAt,
        uploadFilesDescription: holyProjectDatabase.uploadFilesDescription,
        uploadFilesCount: holyProjectDatabase.uploadFilesCount,
        shareLinksDescription: holyProjectDatabase.shareLinksDescription,
        shareLinksCount: holyProjectDatabase.shareLinksCount,
        qcmContent: qcmContent,
        evaluationType: holyProjectDatabase.evaluationType,
        evaluatorType: holyProjectDatabase.evaluatorType
      };

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
          message: err,
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
      if (req.body.links)
        req.body.links = JSON.parse(req.body.links);
      if (req.body.qcmContent) {
        let qcmContent = JSON.parse(req.body.qcmContent);
        req.body.qcmContent = qcmContent.map((qcm: any) => {
          return {
            question: qcm.question,
            type: qcm.type,
            options: qcm.options,
            correctAnswers: qcm.correctAnswers
          }
        });
      }
      if (req.body.uploadFilesDescription === 'undefined')
        req.body.uploadFilesDescription = null;
      if (req.body.uploadFilesCount === 'undefined')
        req.body.uploadFilesCount = 0;
      if (req.body.shareLinksDescription === 'undefined')
        req.body.shareLinksDescription = null;
      if (req.body.shareLinksCount === 'undefined')
        req.body.shareLinksCount = 0;
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
        if (req.body.qcmContent) {
          let qcmContent = JSON.parse(req.body.qcmContent);
          req.body.qcmContent = qcmContent.map((qcm: any) => {
            return {
                question: qcm.question,
                type: qcm.type,
                options: qcm.options,
                correctAnswers: qcm.correctAnswers
            }
          });
        }
      if (req.body.uploadFilesDescription === 'undefined')
        req.body.uploadFilesDescription = null;
      if (req.body.uploadFilesCount === 'undefined')
        req.body.uploadFilesCount = 0;
      if (req.body.shareLinksDescription === 'undefined')
        req.body.shareLinksDescription = null;
      if (req.body.shareLinksCount === 'undefined')
        req.body.shareLinksCount = 0;
      if (req.body.links)
        req.body.links = JSON.parse(req.body.links);
      holyProject = await HolyProject.findByIdAndUpdate(id, req.body, {new: true});

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

  async delete(id: string) {
    try {
      let holyProject = await HolyProject.findById(id);
      if (!holyProject) {
        throw new Error("No Holy Project found with this id !");
      }

     await HolyProject.findByIdAndDelete(id);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Holy Project deleted with success"
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

  async hasEvaluationLink(req: Request, url: string) {
    try {
      if (!url) {
        throw new Error("Url is mandatory !");
      }
      const holyProject = await HolyProject.findOne({url: url}) as IHolyGraph;
      if (!holyProject) {
        throw new Error("No Holy Project found with this url !");
      }
      // @ts-ignore
      let user = req.user as IUser;
      let evaluationDB = await Evaluation.findOne({user: user._id, project: holyProject._id});
      if (evaluationDB && !evaluationDB.project) {
        await Evaluation.findByIdAndDelete(evaluationDB._id);
        return {
          success: true,
          statusCode: 200,
          errors: null,
          data: {
            exist: false
          },
        }
      }
      if (evaluationDB) {
        return {
          success: true,
          statusCode: 201,
          errors: null,
          data: {
            exist: true,
            evaluationID: evaluationDB._id
          },
        };
      } else {
        return {
          success: true,
          statusCode: 201,
          errors: null,
          data: {
            exist: false
          },
        };
      }
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
      if (!url) {
        throw new Error("Url is mandatory !");
      }
      const holyProject = await HolyProject.findOne({url: url}) as IHolyGraph;
      if (!holyProject) {
        throw new Error("No Holy Project found with this url !");
      }
      // @ts-ignore
      let user = req.user as IUser;
      let databaseUser = await User.findById(user._id);
      if (!databaseUser) {
        throw new Error("No user found !");
      }
      if (user.coin < (holyProject.cost || 1)) {
        throw new Error("Not enough coin to generate evaluation !");
      }

      let userProject = user.holyProjects.find(hp => hp.project.toString() === holyProject._id.toString() && hp.resultPercent > 80);
      if (userProject?.resultPercent) {
        throw new Error("Project already done !");
      }

      let evaluationDB = await Evaluation.findOne({user: user._id, project: holyProject._id});
      if (evaluationDB) {
        return {
            success: true,
            statusCode: 201,
            errors: null,
            data: {
              message: "Evaluation already exist !",
              evaluationID: evaluationDB._id
            },
        };
      }

      let additionalInformation = [];
      let discordChannel = false;
      let evaluation = null;

      switch (holyProject.evaluationType) {
        case EvaluationType.DISCORD:
          if (user.discordId && user.discordId !== "") {
            databaseUser.holyProjects.push({
                project: holyProject._id,
                resultPercent: 100,
                evaluator: null
            })
            databaseUser.xp += holyProject.xp;
            databaseUser.coin -= (holyProject.cost || 1);
            await databaseUser.save();
            return {
              success: true,
              statusCode: 201,
              errors: null,
              data: {
                message: "Evaluation finished with success",
                percent: 100,
                evaluationID: null
              },
            }
          }
          evaluation = await Evaluation.create({
            user: user._id,
            project: holyProject._id,
            discord: true
          });
          break;
        case EvaluationType.STANDARD:
          discordChannel = true;
          break;
        case EvaluationType.UPLOAD:
          if (!req.files || req.files.length !== holyProject.uploadFilesCount) {
            throw new Error("You must provide all upload files !");
          }
          // @ts-ignore
          for (let file of req.files) {
            const identifier = await StorageCdn.generateRandomFilename(file.originalname);
            let filePath = `evaluation/${identifier}`;
            let { bunnyFilePath, duration } = await StorageCdn.uploadEvaluationFile(file.path, filePath, file.originalname);
            if (bunnyFilePath && bunnyFilePath !== "") {
                additionalInformation.push(`${CST.URL.REDIRECT}${identifier}`);
            } else {
              throw new Error("Error during upload file !");
            }
          }
          discordChannel = true;
          break;
        case EvaluationType.SHARE_LINKS:
            if (!req.body.shareLinks || req.body.shareLinks.length === 0) {
                throw new Error("Share links is mandatory !");
            }
            if (req.body.shareLinks.length !== holyProject.shareLinksCount) {
                throw new Error("You must provide all share links !");
            }
            additionalInformation = req.body.shareLinks;
            discordChannel = true;
            break;
        case EvaluationType.QCM:
          evaluation = await Evaluation.create({
            user: user._id,
            project: holyProject._id,
            uploadFiles: [],
            sharedLinks: []
          });
          const bodyQcm = JSON.parse(req.body.answers);
          console.log(bodyQcm);

          if (!bodyQcm || Object.keys(bodyQcm).length === 0) {
            throw new Error("QCM content is mandatory !");
          }

          if (Object.keys(bodyQcm).length !== holyProject.qcmContent.length) {
            throw new Error("You must provide all qcm content !");
          }

          let totalQuestions = holyProject.qcmContent.length;
          let correctCount = 0;

          for (let i = 0; i < totalQuestions; i++) {
            const qcm = holyProject.qcmContent[i];
            const submittedAnswers: string[] = bodyQcm[i.toString()] || [];

            if (!Array.isArray(submittedAnswers)) {
              throw new Error(`Answers for question ${i} must be an array`);
            }

            const expectedAnswers = qcm.correctAnswers;
            const allOptions = qcm.options;

            const hasAllCorrect = expectedAnswers.every(ans => submittedAnswers.includes(ans));
            const hasNoWrong = submittedAnswers.every(ans => expectedAnswers.includes(ans));

            if (hasAllCorrect && hasNoWrong) {
              correctCount++;
            }
          }
          let percent = Math.round((correctCount / totalQuestions) * 100);
          databaseUser.holyProjects.push({
            project: holyProject._id,
            resultPercent: percent,
            evaluator: null
          });
          databaseUser.coin -= (holyProject.cost || 1);
          if (percent >= 80) {
            databaseUser.xp += holyProject.xp;
          }
          await databaseUser.save();
          await Evaluation.findByIdAndDelete(evaluation._id);
          return {
            success: true,
            statusCode: 201,
            errors: null,
            data: {
              message: "Evaluation finished with success",
              percent: percent,
              evaluationID: null
            },
          }
        default:
            throw new Error("No evaluation type found !");
      }
      evaluation = await Evaluation.create({
        user: user._id,
        project: holyProject._id,
        uploadFiles: (holyProject.evaluationType === EvaluationType.UPLOAD ? additionalInformation : []),
        sharedLinks: (holyProject.evaluationType === EvaluationType.SHARE_LINKS ? additionalInformation : []),
      });
      evaluation.project = holyProject as unknown as IHolyProject;
      evaluation.user = user;

      await User.findByIdAndUpdate(user._id, {coin: user.coin - (holyProject.cost || 1)});

      if (discordChannel) {
        await axios.post(`${CST.DISCORD.API_URL}/evaluation/add`, {
          evaluation: evaluation
        })
      }

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Evaluation created with success",
          evaluationID: evaluation._id
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
      const evaluation = await Evaluation.findById(id).populate("project").populate("evaluator").lean();
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
      if (evaluation.percent && evaluation.percent > 0) {
        throw new Error("Evaluation already done !");
      }
      let evaluator = evaluation.evaluator as IUser;
      if (!evaluator) {
        throw new Error("No evaluator found !");
      }
      if (evaluator._id.toString() !== requestUser._id.toString()) {
        throw new Error("You are not the evaluator of this evaluation !");
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
      let evaluation = await Evaluation.findById(id)
          .populate("project")
          .populate("evaluator")
          .lean() as IEvaluation;
      if (!evaluation) {
        throw new Error("No Evaluation found with this id !");
      }
      let evaluator = evaluation.evaluator as IUser;
      if (!evaluator) {
        throw new Error("No evaluator found !");
      }
      if (evaluator._id.toString() !== requestUser._id.toString()) {
        throw new Error("You are not the evaluator of this evaluation !");
      }
      let user = await User.findById(evaluation.user).populate("holyProjects.project") as IUser;

      if (!user) {
        throw new Error("No evaluable user found !");
      }
      if (user._id.toString() === requestUser._id.toString()) {
        throw new Error("You can't evaluate yourself !");
      }
      let project = evaluation.project as IHolyProject;

      if (project.evaluationType === EvaluationType.UPLOAD) {
        for (let file of evaluation.uploadFiles) {
          let path = file.replace(`${CST.URL.REDIRECT}`, "");

          let resource = await Resource.findOne({ pathFile: `evaluation/${path}` }) as IResource;
          if (resource) {
            await StorageCdn.deleteEvaluationFile(resource.pathFile);
            await Resource.findByIdAndDelete(resource._id);
          }
        }
      }
      user.holyProjects.push({
        project: project._id,
        resultPercent: req.body.percent,
        evaluator: evaluator._id
      })

      let level = 0;
      if (project.level >= 1) {
        let count = user.holyProjects.filter(hp => {
          let userProject = hp.project as IHolyProject;
          return userProject.level === project.level && hp.resultPercent >= 80;
        }).length;
        if (req.body.percent >= 80) count++;
        console.log(count)

        let allProject = await HolyProject.find({});
        let allProjectCounter = allProject.filter(p => {
          return p.level === project.level && p.linkedProjectId === null;
        }).length;
        console.log(`counter all ${allProjectCounter}`);
        if (count >= allProjectCounter) {
          level = project.level;
        }
      }
      console.log(level)

      await axios.delete(`${CST.DISCORD.API_URL}/evaluation/finish/${(evaluation.channelId && evaluation.channelId !== "") ? evaluation.channelId : 0}`, {
        data: {
          userId: user.discordId,
          level: level
        }
      });

      await Evaluation.findByIdAndDelete(id);

      if (req.body.percent >= 80)
        user.xp += project.xp;
      let cost = project.cost || 1;
      await user.save();
      await User.findByIdAndUpdate(requestUser._id, {coin: requestUser.coin + cost});

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

  async claimEvaluation(req: Request, id: string) {
    try {
      // @ts-ignore
      let requestUser = req.body.discordId;

      if (!requestUser || requestUser === "") {
        throw new Error("Discord ID is mandatory !");
      }
      if (!id || id === "") {
        throw new Error("Evaluation ID is mandatory !");
      }

      let evaluation = await Evaluation.findById(id)
          .populate("project")
          .populate("user");
      if (!evaluation) {
        throw new Error("No Evaluation found with this id !");
      }
      if (evaluation.evaluator !== null) {
        throw new Error("Un evaluateur a déjà été assigné à cette évaluation !");
      }
      let evaluator = await User.findOne({discordId: requestUser}) as IUser;
      if (!evaluator) {
        throw new Error("No evaluator user found !");
      }
      if (evaluator._id.toString() === evaluation.user._id.toString()) {
        throw new Error("Vous ne pouvez pas vous évaluer vous-même !");
      }
      let project = evaluation.project as IHolyProject;
      let user = evaluation.user as IUser;
      if (project.evaluatorType === EvaluatorType.EVALUATOR) {
        if (evaluator.permission !== "evaluateur" && evaluator.permission !== "admin" && evaluator.permission !== "formateur") {
          throw new Error("Vous n'êtes pas évaluateur !");
        }
      } else if (project.evaluatorType === EvaluatorType.FORMATOR) {
        if (evaluator.permission !== "admin" && evaluator.permission !== "formateur") {
          throw new Error("Vous n'êtes pas formateur !");
        }
      }
      evaluation = await Evaluation.findByIdAndUpdate(id, {evaluator: evaluator._id}, {new: true}).populate("project").populate("user");
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Evaluation has been claimed with success !",
          evaluation
        },
      };
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        token: null,
        data: {
          message:err.message,
        },
      };
    }
  }

  async updateChannelFromDiscord(req: Request, id: string) {
    try {
      // @ts-ignore
      let channelId = req.body.channelId;

      if (!channelId || channelId === "") {
        throw new Error("Channel ID is mandatory !");
      }
      if (!id || id === "") {
        throw new Error("Evaluation ID is mandatory !");
      }

      let evaluation = await Evaluation.findById(id)
          .lean();
      if (!evaluation) {
        throw new Error("No Evaluation found with this id !");
      }
      await Evaluation.findByIdAndUpdate(id, {channelId: channelId});
      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Evaluation channel has been updated with success !",
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
