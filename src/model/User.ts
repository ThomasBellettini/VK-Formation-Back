import mongoose, {Document, Schema} from 'mongoose';
import bcrypt from 'bcryptjs';
import {ILesson} from "./learning/Lesson.js";
import {IHolyProject} from "./learning/HolyProject";

const saltRounds = 10;

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    password: string;
    permission: string;

    isConfirmed: boolean;
    confirmationCode: string | null;
    resetCode: string | null;

    xp: number;
    coin: number;

    discordAccess: boolean;
    discordId: string;
    discordLinkCode: string;

    lastLogin: Date;

    lessonsFinished: (mongoose.Types.ObjectId | ILesson)[];

    holyProjects: {
        project: mongoose.Types.ObjectId | IHolyProject;
        resultPercent: number;
        evaluator: (mongoose.Types.ObjectId | IUser) | null;
    }[];

    createdAt?: Date;
    updatedAt?: Date;

    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema: Schema<IUser> = new mongoose.Schema({
    email: {
        type: String,
        index: true,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    permission: {
        type: String,
        default: "user"
    },
    isConfirmed: {
        type: Boolean,
        default: true
    },
    confirmationCode: {
        type: String,
        required: false
    },
    resetCode: {
        type: String,
        required: false
    },
    xp: {
        type: Number,
        required: false,
        default: 0
    },
    coin: {
        type: Number,
        required: false,
        default: 0
    },
    lessonsFinished: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
    }],
    holyProjects: [{
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HolyProject"
        },
        resultPercent: {
            type: Number,
            default: 0
        },
        evaluator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    }],
    discordAccess: {
        type: Boolean,
        required: false,
        default: false
    },
    discordId: {
        type: String,
        required: false
    },
    discordLinkCode: {
        type: String,
        required: false
    },
    lastLogin: {
        type: Date,
        required: false,
        default: null
    },

}, {
    timestamps: true
});

userSchema.pre('save', function(next) {
    const user = this;
    if (!user.isModified('password')) return next();
    bcrypt.genSalt(saltRounds, function(err: mongoose.CallbackError | undefined, salt: any) {
        if (err) return next(err);
        bcrypt.hash(user.password, salt, function(err: mongoose.CallbackError | undefined, hash: string) {
            if (err) return next(err);
            user.password = hash;
            next();
        });
    });
});

userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (err : any) {
        throw err;
    }
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
