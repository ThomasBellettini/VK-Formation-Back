import mongoose, {Document, Schema} from 'mongoose';
import {IUser} from "./User.js";

export interface ITransaction extends Document {
    _id: mongoose.Types.ObjectId;

    user: (mongoose.Types.ObjectId | IUser);
    productName: string;
    cost: number;

    createdAt?: Date;
    updatedAt?: Date;
}

const transactionSchema: Schema<ITransaction> = new mongoose.Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    cost: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction;
