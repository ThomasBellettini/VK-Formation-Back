import mongoose, {Document, Schema} from 'mongoose';
import { IPlanet } from './Planet.js';

export interface ILesson extends Document {
    _id: mongoose.Types.ObjectId;
    url: string;

    title: string;
    description: string;
    content: string;

    order: number;

    planet: IPlanet | mongoose.Types.ObjectId;

    cdnVideoContent: string | null;
    cdnAudioContent: string | null;
    thumbnail: string;

    duration: number | null;

    links: {
        url: string;
        name: string;
    }[]

    createdAt?: Date;
    updatedAt?: Date;
}

const lessonSchema: Schema<ILesson> = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    url: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    content: {
        type: String,
        default: ""
    },
    order: {
        type: Number,
        default: 0
    },
    cdnVideoContent: {
        type: String,
        required: false
    },
    thumbnail: {
        type: String,
        required: false
    },
    cdnAudioContent: {
        type: String,
        required: false
    },
    duration: {
        type: Number,
        required: false
    },
    links: [{
        url: {
            type: String,
            required: false,
            default: ""

        },
        name: {
            type: String,
            required: false,
            default: ""
        }
    }],
    planet: {
        type: mongoose.Types.ObjectId,
        ref: 'Planet',
        required: false
    }

}, {
    timestamps: true
});

const Lesson = mongoose.model<ILesson>('Lesson', lessonSchema);

export default Lesson;
