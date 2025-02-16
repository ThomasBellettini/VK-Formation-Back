import mongoose, {Document, Schema} from 'mongoose';
import {ILesson} from "./Lesson.js";

export interface ICourseBundle extends Document {
    _id: mongoose.Types.ObjectId;

    url: string;
    image: string;
    title: string;
    description: string;
    lessons: (ILesson | mongoose.Types.ObjectId)[];

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
    lessons: [{
        type: Schema.Types.ObjectId,
        ref: 'Lesson'
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
    }]

}, {
    timestamps: true
});

const CourseBundle = mongoose.model<ICourseBundle>('CourseBundle', courseBundle);

export default CourseBundle;
