import mongoose, {Document, Schema} from 'mongoose';
import {ILesson} from "./learning/Lesson";
import {IFolder} from "./learning/Folder";
import {ICourseBundle} from "./learning/CourseBundle";

export interface IContributor extends Document {
    _id: mongoose.Types.ObjectId;

    name: string;
    image: string;

    createdAt?: Date;
    updatedAt?: Date;
}



const contributorSchema: Schema<IContributor> = new mongoose.Schema({
    image: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    }

}, {
    timestamps: true
});

const Contributor = mongoose.model<IContributor>('Contributor', contributorSchema);

export default Contributor;
