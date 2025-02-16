import {IUser} from "../model/User.js";
import {Request} from "express";
import CourseBundle from "../model/learning/CourseBundle.js";
import {ILesson} from "../model/learning/Lesson.js";
import mongoose from "mongoose";
import StorageCdn from "../utils/StorageCdn.js";

interface ICourse {
    _id: mongoose.Types.ObjectId;
    url: string;
    image: string;
    title: string;
    description: string | null;
    percent: number;

    duration: number | null;

    lessons: (ILesson | mongoose.Types.ObjectId)[];

    links: {
      name: string;
      url: string;
    }[];

    createdAt?: Date;
    updatedAt?: Date;
}

class CourseServices {
  constructor() {
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.update = this.update.bind(this);
    this.info = this.info.bind(this);
  }

  async list(req: Request) {
    try {
      // @ts-ignore
      let user = req.user as IUser;
      let courseBundle = await CourseBundle.find({}).populate("lessons").lean();
       let courses: ICourse[] = courseBundle.map((iterator) => {
         let imageLink = StorageCdn.generateSecureLink(iterator.image);
         let duration = 0;
         for (let lesson of iterator.lessons) {
           // @ts-ignore
           if (lesson.duration && lesson.duration > 0) duration += lesson.duration;
         }
         if (!user) {
          return {
            _id: iterator._id,
            url: iterator.url,
            duration,
            image: imageLink,
            title: iterator.title,
            description: iterator.description,
            percent: 0,
            lessons: [],
            links: [],
            createdAt: iterator.createdAt,
            updatedAt: iterator.updatedAt
          }
        } else {
          let finishedLessonIds = new Set(user.lessonsFinished.map(id => id.toString()));
          let totalLessons = iterator.lessons.length;
          let completedLessons = iterator.lessons.filter(lesson => finishedLessonIds.has(lesson._id.toString())).length;
          let percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;


          return {
            _id: iterator._id,
            url: iterator.url,
            image: imageLink,
            title: iterator.title,
            description: iterator.description,
            percent,
            duration,
            links: iterator.links,
            lessons: iterator.lessons,
            createdAt: iterator.createdAt,
            updatedAt: iterator.updatedAt
          };
        }


      })

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          courses
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
      // @ts-ignore
      let user = req.user as IUser;
      let courseBundle = await CourseBundle.findOne({url: url}).populate("lessons").lean();
      if (!courseBundle) throw new Error("No Course found with this id !");
      let imageLink = StorageCdn.generateSecureLink(courseBundle.image);

      let finishedLessonIds = new Set(user.lessonsFinished.map(id => id.toString()));
      let totalLessons = courseBundle.lessons.length;
      let completedLessons = courseBundle.lessons.filter(lesson => finishedLessonIds.has(lesson._id.toString())).length;
      let percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      let lessons = courseBundle.lessons.map((lesson: any) => {
        let finished = finishedLessonIds.has(lesson._id.toString());
        return {
          _id: lesson._id,
          url: lesson.url,
          title: lesson.title,
          description: lesson.description,
          content: lesson.content,
          order: lesson.order,
          cdnVideoContent: lesson.cdnVideoContent,
          cdnAudioContent: lesson.cdnAudioContent,
          finished
        }
      });
      let course: ICourse = {
        _id: courseBundle._id,
        url: courseBundle.url,
        image: imageLink,
        title: courseBundle.title,
        description: courseBundle.description,
        percent,
        // @ts-ignore
        lessons: lessons,
        createdAt: courseBundle.createdAt,
        updatedAt: courseBundle.updatedAt
      };

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          course
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
      const {title, url} = req.body;
      if (!title || !url) {
        throw new Error("Missing mandatory fields title, url, image")
      }
      if (req.file) {
        const identifier = await StorageCdn.generateRandomFilename(req.file.originalname);
        let filePath = `images/${identifier}`;
        let { bunnyFilePath, duration } = await StorageCdn.uploadFile(req.file.path, filePath, req.file.originalname, false);
        req.body.image = bunnyFilePath;
      } else {
        throw new Error("Missing image file")
      }
      let courseBundle = await CourseBundle.create(req.body);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Course has been created with success",
          courseBundle
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
      let courseBundle = await CourseBundle.findOne({_id: id});
      if (!courseBundle) throw new Error("No Course has been found with this ID !");
      if (req.file) {
        const identifier = await StorageCdn.generateRandomFilename(req.file.originalname);
        let filePath = `images/${identifier}`;
        let { bunnyFilePath, duration } = await StorageCdn.uploadFile(req.file.path, filePath, req.file.originalname, false);
        req.body.image = bunnyFilePath;
      }
      if (req.body.lessons) {
        let lessonID = req.body.lessons;
        if (!Array.isArray(lessonID)) {
          lessonID = JSON.parse(lessonID);
        }
        req.body.lessons = lessonID.map((id: string) => new mongoose.Types.ObjectId(id));
      }
      courseBundle = await CourseBundle.findOneAndUpdate({_id: id}, req.body);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Course has been updated with success",
          courseBundle
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
export default CourseServices;
