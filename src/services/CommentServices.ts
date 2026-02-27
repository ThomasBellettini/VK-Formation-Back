import Lesson from "../model/learning/Lesson.js";
import Comment from "../model/learning/Comment.js";
import CommentLike from "../model/learning/CommentLike.js";
import { Request } from "express";
import mongoose from "mongoose";

class CommentServices {
  constructor() {
    this.list = this.list.bind(this);
    this.add = this.add.bind(this);
    this.delete = this.delete.bind(this);
    this.like = this.like.bind(this);
    this.unlike = this.unlike.bind(this);
  }

  async list(req: Request, id: string) {
    try {
      let lesson = await Lesson.findById(id).lean();
      if (!lesson) throw new Error("No lesson was founded !");

      let comments = await Comment.find({lesson: id})
        .populate("user", "email discordUsername discordAvatar")
        .lean();

      const commentIds = comments.map(c => c._id);
      const likesList = await CommentLike.aggregate([
        { $match: { comment: { $in: commentIds } } },
        { $group: { _id: "$comment", likesCount: { $sum: 1 }, likedByUser: { $addToSet: "$user" } } }
      ])

      const likesMap = new Map<string, { likesCount: number, likedByUser: mongoose.Types.ObjectId[] }>();
      likesList.forEach(like => {
        likesMap.set(like._id.toString(), { likesCount: like.likesCount, likedByUser: like.likedByUser });
      });

      comments = comments.map(c => {
        const likesInfo = likesMap.get(c._id.toString()) || { likesCount: 0, likedByUser: [] };
        return {
          ...c,
          likesCount: likesInfo.likesCount,
          likedByUser: likesInfo.likedByUser
        }
      })

      // @ts-ignore
      comments.sort((a, b) => b.likesCount - a.likesCount);

      return {
        success: true,
        statusCode: 200,
        errors: null,
        data: {
          comments
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

  async add(req: Request, id: string) {
    try {
      // @ts-ignore
      const authUser = req.user;
      let lesson = await Lesson.findById(id).lean();
      if (!lesson) throw new Error("No lesson was found !");
      const { content, parentId } = req.body;
      if (!content) throw new Error("Missing mandatory field content");

      if (parentId) {
        const parent = await Comment.findById(parentId).lean();
        if (!parent) throw new Error("No parent comment was found !");
        if (parent.lesson.toString() !== id) throw new Error("Parent comment does not belong to this lesson !");
      }

      const comment = await Comment.create({
        user: authUser._id,
        lesson: id,
        content,
        parentId: parentId || null
      });

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Success, comment added !",
          comment
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

  async delete(req: Request, id: string) {
    try {
      // @ts-ignore
      const authUser = req.user;
      let comment = await Comment.findById(id).lean();
      if (!comment) throw new Error("No comment was founded !");

      const isAdmin = authUser.permission && authUser.permission.includes("admin");

      if (!isAdmin) {
        if (comment.user.toString() !== authUser._id.toString()) throw new Error("You are not the owner of this comment !");
      }

      await Comment.findByIdAndDelete(id);

      return {
        success: true,
        statusCode: 200,
        errors: null,
        data: {
          message: "Success, comment deleted !",
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

  async like(req: Request, id: string) {
    try {
      // @ts-ignore
      const authUser = req.user;
      let comment = await Comment.findById(id).lean();
      if (!comment) throw new Error("No comment was founded !");

      const existingLike = await CommentLike.findOne({ comment: id, user: authUser._id }).lean();
      if (existingLike) throw new Error("You have already liked this comment !");

      await CommentLike.create({
        comment: id,
        user: authUser._id
      });

      return {
        success: true,
        statusCode: 201,
        errors: null,
        data: {
          message: "Success, comment liked !",
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

  async unlike(req: Request, id: string) {
    try {
      // @ts-ignore
      const authUser = req.user;
      let comment = await Comment.findById(id).lean();
      if (!comment) throw new Error("No comment was founded !");

      const existingLike = await CommentLike.findOne({ comment: id, user: authUser._id }).lean();
      if (!existingLike) throw new Error("You have not liked this comment yet !");

      await CommentLike.findByIdAndDelete(existingLike._id);

      return {
        success: true,
        statusCode: 200,
        errors: null,
        data: {
          message: "Success, comment unliked !",
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

}

export default CommentServices;
