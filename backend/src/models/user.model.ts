import mongoose, { Document, Schema } from "mongoose";
import { compareValue, hashValue } from "../utils/bcrypt"

export interface UserDocument extends Document {
    name: string;
    email?: string;
    password?: string;
    avatar?: string | null;
    isAI: boolean
    createdAt: Date;
    updatedAt: Date;

    comparePassword(value: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
    {
        name: { type: String, required: true },
        email: {
            type: String,
            unique: true,
            trim: true,
            lowercase: true,
            required: function (this: UserDocument) {
                return !this.isAI;
            },
        },
        password: {
            type: String,
            required: function (this: UserDocument) {
                return !this.isAI;
            }
        },
        avatar: { type: String, default: null },
        isAI: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform: (doc, ret) => {
                if (ret) {
                    delete ret.password;
                }
                return ret;
            }
        }
    }
)

userSchema.pre("save", async function () {
    if (this.password && this.isModified("password")) {
        this.password = await hashValue(this.password);
    }
});

userSchema.methods.comparePassword = async function (val: string) {
    return compareValue(val, this.password);
}

const UserModel = mongoose.model<UserDocument>("User", userSchema);

export default UserModel;