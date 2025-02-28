import mongoose, {Document, Schema} from 'mongoose';
import {ILesson} from "./Lesson.js";
import {IFolder} from "./Folder.js";

export interface ICourseBundle extends Document {
    _id: mongoose.Types.ObjectId;

    url: string;
    image: string;
    title: string;
    description: string;
    folders: (IFolder | mongoose.Types.ObjectId)[];
    order: number;

    links: {
        name: string;
        url: string;
    }[];

    createdAt?: Date;
    updatedAt?: Date;
}



const courseBundle: Schema<ICourseBundle> = new mongoose.Schema({
    url: {
        type: String,
        required: true,
        unique: true
    },
    image: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    folders: [{
        type: Schema.Types.ObjectId,
        ref: 'Folder',
        default: []
    }],
    links: [{
        name: {
            type: String,
            required: false
        },
        url: {
            type: String,
            required: false
        }
    }],
    order: {
        type: Number,
        required: false,
        default: 0
    }

}, {
    timestamps: true
});

const CourseBundle = mongoose.model<ICourseBundle>('CourseBundle', courseBundle);

export default CourseBundle;
