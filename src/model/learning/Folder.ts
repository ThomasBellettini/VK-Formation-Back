import mongoose, {Document, Schema} from 'mongoose';
import {ILesson} from "./Lesson.js";

export interface IFolder extends Document {
    _id: mongoose.Types.ObjectId;

    url: string;
    image: string;
    name: string;
    lessons: (ILesson | mongoose.Types.ObjectId)[];
    order: number;

    createdAt?: Date;
    updatedAt?: Date;
}



const folderSchema: Schema<IFolder> = new mongoose.Schema({
    url: {
        type: String,
        required: true,
        unique: true
    },
    image: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    lessons: [{
        type: Schema.Types.ObjectId,
        ref: 'Lesson'
    }],
    order: {
        type: Number,
        required: false,
        default: 0
    }

}, {
    timestamps: true
});

const Folder = mongoose.model<IFolder>('Folder', folderSchema);

export default Folder;
