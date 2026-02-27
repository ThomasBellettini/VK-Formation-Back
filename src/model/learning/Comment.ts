import mongoose, {Document, Schema} from 'mongoose';
import {IUser} from "../User.js";
import {ILesson} from "./Lesson.js";

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  user: (mongoose.Types.ObjectId | IUser);
  lesson: (mongoose.Types.ObjectId | ILesson);
  parentId: (mongoose.Types.ObjectId | IComment) | null;

  content: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const commentSchema: Schema<IComment> = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  content: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const Comment = mongoose.model<IComment>('Comment', commentSchema);

export default Comment;
