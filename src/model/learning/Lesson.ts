import mongoose, {Document, Schema} from 'mongoose';

export interface ILesson extends Document {
    _id: mongoose.Types.ObjectId;
    url: string;

    title: string;
    description: string;
    content: string;

    order: number;

    cdnVideoContent: string | null;
    cdnAudioContent: string | null;

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
        required: true
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
    cdnAudioContent: {
        type: String,
        required: false
    }

}, {
    timestamps: true
});

const Lesson = mongoose.model<ILesson>('Lesson', lessonSchema);

export default Lesson;
