import HolyProject from "../model/learning/HolyProject.js";
import {IUser} from "../model/User.js";
import {Request} from "express";
import CourseBundle, {ICourseBundle} from "../model/learning/CourseBundle.js";
import {ILesson} from "../model/learning/Lesson.js";
import mongoose from "mongoose";

interface ICourse {
    url: string;
    image: string;
    title: string;
    description: string | null;
    percent: number;

    lessons: (ILesson | mongoose.Types.ObjectId)[];

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
      let courseBundle = await CourseBundle.find({}).lean();
       let courses: ICourse[] = courseBundle.map((iterator) => {
        if (!user) {
          return {
            url: iterator.url,
            image: iterator.image,
            title: iterator.title,
            description: iterator.description,
            percent: 0,
            lessons: [],
            createdAt: iterator.createdAt,
            updatedAt: iterator.updatedAt
          }
        } else {
          let finishedLessonIds = new Set(user.lessonsFinished.map(id => id.toString()));
          let totalLessons = iterator.lessons.length;
          let completedLessons = iterator.lessons.filter(lesson => finishedLessonIds.has(lesson._id.toString())).length;
          let percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

          return {
            url: iterator.url,
            image: iterator.image,
            title: iterator.title,
            description: iterator.description,
            percent,
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

  async info(req: Request, id: string) {
    try {
      // @ts-ignore
      let user = req.user as IUser;
      let courseBundle = await CourseBundle.findOne({_id: id}).populate("lessons").lean();
      if (!courseBundle) throw new Error("No Course found with this id !");

      let finishedLessonIds = new Set(user.lessonsFinished.map(id => id.toString()));
      let totalLessons = courseBundle.lessons.length;
      let completedLessons = courseBundle.lessons.filter(lesson => finishedLessonIds.has(lesson._id.toString())).length;
      let percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      let course: ICourse = {
        url: courseBundle.url,
        image: courseBundle.image,
        title: courseBundle.title,
        description: courseBundle.description,
        percent,
        lessons: courseBundle.lessons,
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
      const {name, description, url, image} = req.body;
      if (!name || !description || !url || !image) {
        throw new Error("Missing mandatory fields name, description, url, image")
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
