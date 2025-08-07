import mongoose, {Document, Schema} from 'mongoose';
import { IUser } from './User.js';

export interface IDriveResource extends Document {
    _id: mongoose.Types.ObjectId;

    title: string;
    url: string;
    category: string;

    createdAt?: Date;
    updatedAt?: Date;
}



const driveResourceSchema: Schema<IDriveResource> = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const DriveResource = mongoose.model<IDriveResource>('DriveResource', driveResourceSchema);

export default DriveResource;
