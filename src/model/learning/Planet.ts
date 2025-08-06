import mongoose, {Document, mongo, Schema} from 'mongoose';
import { IHolyProject } from './HolyProject.js';
import { ILesson } from './Lesson.js';
import { IPolaris } from './Polaris.js';

export interface IPlanet extends Document {
    _id: mongoose.Types.ObjectId;
    url: string;

    polaris: IPolaris | mongoose.Types.ObjectId;

    name: string;
    description: string;
    modelName: string;
    level: number;

    isDone: boolean;

    courses: ILesson | mongoose.Types.ObjectId;
    projects: IHolyProject | mongoose.Types.ObjectId;

    createdAt?: Date;
    updatedAt?: Date;
}

const planetSchema: Schema<IPlanet> = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    level: {
        type: Number,
        required: true,
    },
    isDone: {
        type: Boolean,
        required: true,
        default: false
    },
    courses: {
        type: mongoose.Types.ObjectId,
        ref: 'Lesson',
    },
    projects: {
        type: mongoose.Types.ObjectId,
        ref: 'HolyProject',
    },
    url: {
        type: String,
        required: true,
        unique: true
    },
    modelName: {
        type: String,
        required: true,
    },
    polaris: {
        type: mongoose.Types.ObjectId,
        ref: 'Polaris',
        required: false
    }
}, {
    timestamps: true
});

const Planet = mongoose.model<IPlanet>('Planet', planetSchema);

export default Planet;
