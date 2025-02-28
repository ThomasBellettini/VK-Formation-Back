import {IUser} from "../model/User.js";
import {Request} from "express";
import CourseBundle from "../model/learning/CourseBundle.js";
import {ILesson} from "../model/learning/Lesson.js";
import mongoose from "mongoose";
import StorageCdn from "../utils/StorageCdn.js";
import {IFolder} from "../model/learning/Folder.js";

interface ICourse {
    _id: mongoose.Types.ObjectId;
    url: string;
    image: string;
    title: string;
    description: string | null;
    percent: number;
    duration: number | null;
    lessons: string[] | null;

    folders: (IFolder | mongoose.Types.ObjectId)[];
    order: number;
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
    this.delete = this.delete.bind(this);
  }

  async list(req: Request) {
    try {
      // @ts-ignore
      let user = req.user as IUser;

      let courseBundle = await CourseBundle.find({})
          .populate({
            path: "folders",
            model: "Folder",
            options: { sort: { order: 1 } }, // Trie les folders par order
            populate: {
              path: "lessons",
              model: "Lesson",
              options: { sort: { order: 1 } }, // Trie les lessons par order
            }
          })
          .sort({ order: 1 })
          .lean();
      let courses: ICourse[] = courseBundle.map((course) => {
        if (!course.folders) course.folders = [];
        let imageLink = StorageCdn.generateSecureLink(course.image);
        let duration = 0;
        let totalLessons = 0;
        let completedLessons = 0;
        let lessons = [];
        for (let folder of course.folders as IFolder[]) {
          if (!folder || !folder.lessons) continue;

          for (let lesson of folder.lessons as ILesson[]) {
            if (!lesson) continue;
            lessons.push(lesson._id.toString());
            if (lesson.duration && lesson.duration > 0) {
              duration += lesson.duration;
            }
            totalLessons++;
          }
        }

        let percent = 0;
        if (user) {
          let finishedLessonIds = new Set(user.lessonsFinished.map(id => id.toString()));

          lessons.forEach((lesson) => {
            if (finishedLessonIds.has(lesson)) {
              completedLessons++;
            }
          })

          percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        }

        return {
          _id: course._id,
          url: course.url,
          image: imageLink,
          title: course.title,
          description: course.description,
          percent,
          duration,
          lessons: lessons,
          order: course.order,
          links: course.links,
          folders: course.folders,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt
        };
      });

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: { courses },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        token: null,
        data: { message: err },
      };
    }
  }

  async info(req: Request, url: string) {
    try {
      // @ts-ignore
      let user = req.user as IUser;
      let courseBundle = await CourseBundle.findOne({ url: url })
          .populate({
            path: "folders",
            model: "Folder",
            options: { sort: { order: 1 } }, // Trie les folders par order
            populate: {
              path: "lessons",
              model: "Lesson",
              options: { sort: { order: 1 } }, // Trie les lessons par order
            }
          })
          .lean();

      if (!courseBundle) throw new Error("No Course found with this ID!");
      if (!courseBundle.folders) courseBundle.folders = [];

      let imageLink = StorageCdn.generateSecureLink(courseBundle.image);

      let finishedLessonIds = new Set(user.lessonsFinished.map(id => id.toString()));
      let totalLessons = 0;
      let completedLessons = 0;
      let duration = 0;

      let folders = courseBundle.folders.map((folder: any) => {
        let folderLessons = folder.lessons.map((lesson: any) => {
          let finished = finishedLessonIds.has(lesson._id.toString());
          if (lesson.duration && lesson.duration > 0) duration += lesson.duration;
          totalLessons++;
          if (finished) completedLessons++;

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
          };
        });

        return {
          _id: folder._id,
          title: folder.title,
          order: folder.order,
          lessons: folderLessons
        };
      });

      let percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      let course: ICourse = {
        _id: courseBundle._id,
        url: courseBundle.url,
        image: imageLink,
        order: courseBundle.order,
        links: courseBundle.links,
        title: courseBundle.title,
        description: courseBundle.description,
        percent,
        duration,
        lessons: null,
        folders: folders as IFolder[],
        createdAt: courseBundle.createdAt,
        updatedAt: courseBundle.updatedAt
      };

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: { course },
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
        statusCode: 500,
        errors: err,
        token: null,
        data: { message: err },
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
      if (req.body.lessons)
        req.body.lessons = JSON.parse(req.body.lessons);
      if (req.body.links)
        req.body.links = JSON.parse(req.body.links);
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
      if (req.body.lessons)
        req.body.lessons = JSON.parse(req.body.lessons);
      if (req.body.links)
        req.body.links = JSON.parse(req.body.links);
      if (req.body.folders)
        req.body.folders = JSON.parse(req.body.folders);
      courseBundle = await CourseBundle.findOneAndUpdate({_id: id}, req.body, {new: true});

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

  async delete(id: string) {
    try {
      let courseBundle = await CourseBundle.findOne({_id: id});
      if (!courseBundle) throw new Error("No Course has been found with this ID !");
      await CourseBundle.findByIdAndDelete(id);

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Course has been deleted with success",
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
