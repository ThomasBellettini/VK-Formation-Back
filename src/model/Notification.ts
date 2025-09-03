import mongoose, {Document, Schema} from 'mongoose';
import { IUser } from './User.js';

export interface INotification extends Document {
    _id: mongoose.Types.ObjectId;

    title: string;
    description: string;

    linkedUser: mongoose.Types.ObjectId | IUser;

    createdAt?: Date;
    updatedAt?: Date;
}



const notificationSchema: Schema<INotification> = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    linkedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
