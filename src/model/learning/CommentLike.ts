import mongoose, {Document, Schema} from 'mongoose';
import {IComment} from "./Comment";
import {IUser} from "../User";


export interface ICommentLike extends Document {
  _id: mongoose.Types.ObjectId;
  comment: (mongoose.Types.ObjectId | IComment)
  user: (mongoose.Types.ObjectId | IUser);

  createdAt?: Date;
  updatedAt?: Date;
}

const commentLikeSchema: Schema<ICommentLike> = new mongoose.Schema({
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});
commentLikeSchema.index({ comment: 1, user: 1 }, { unique: true });

const CommentLike = mongoose.model<ICommentLike>('CommentLike', commentLikeSchema);

export default CommentLike;
