import mongoose, { Document, Schema } from "mongoose";

export interface MessageDocument extends Document {
    chatId: mongoose.Types.ObjectId;
    sender: mongoose.Types.ObjectId;
    content?: string | null;
    image?: string | null;
    replyTo?: mongoose.Types.ObjectId | null;
    isEdited: boolean;
    isDeleted: boolean;
    deletedAt?: Date | null;
    reactions: { userId: mongoose.Types.ObjectId; emoji: string }[];
    readBy: { userId: mongoose.Types.ObjectId; readAt: Date }[];
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema = new Schema<MessageDocument>(
    {
        chatId: {
            type: Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
        },
        content: { type: String },
        image: { type: String },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        replyTo: {
            type: Schema.Types.ObjectId,
            ref: "Message",
            default: null,
        },
        isEdited: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
        reactions: [{
            userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
            emoji: { type: String, required: true },
        }],
        readBy: [{
            userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
            readAt: { type: Date, required: true },
        }],
    },
    {
        timestamps: true,
    }
)

messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ content: "text" });

const MessageModel = mongoose.model<MessageDocument>("Message", messageSchema);

export default MessageModel;