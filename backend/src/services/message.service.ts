import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ModelMessage, streamText } from "ai";
import mongoose, { Types } from "mongoose";
import cloudinary from "../config/cloudinary.config";
import ChatModel from "../models/chat.model";
import MessageModel from "../models/message.model";
import { BadRequestException, NotFoundException } from "../utils/app-error";
import {
    emitChatAI,
    emitLastMessageToParticipants,
    emitNewMessageToChatRoom,
    emitUpdatedMessageToChatRoom,
    emitMentionNotification,
} from '../lib/socket'
import { Env } from "../config/env.config";
import UserModel from "../models/user.model";
import { validateChatParticipant } from "./chat.service";

const google = createGoogleGenerativeAI({
    apiKey: Env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export const sendMessageService = async (
    userId: string,
    body: {
        chatId: string
        content?: string
        image?: string
        replyToId?: string
    }
) => {
    const { chatId, content, image, replyToId } = body

    const chat = await ChatModel.findOne({
        _id: chatId,
        participants: {
            $in: [userId]
        }
    })
    if (!chat) throw new BadRequestException("Chat not found or unauthorized")

    if (replyToId) {
        const replyMessage = await MessageModel.findOne({
            _id: replyToId,
            chatId,
            $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        })
        if (!replyMessage) throw new NotFoundException("Reply message not found")
    }

    let imageUrl
    if (image) {
        // upload image to cloudinary
        const uploadRes = await cloudinary.uploader.upload(image)
        imageUrl = uploadRes.secure_url
    }

    const newMessage = await MessageModel.create({
        chatId,
        sender: userId,
        content,
        image: imageUrl,
        replyTo: replyToId
            ? new mongoose.Types.ObjectId(replyToId)
            : undefined
    })

    await newMessage.populate([
        { path: 'sender', select: 'name avatar isAI' },
        {
            path: 'replyTo',
            select: 'content image sender isDeleted',
            populate: {
                path: 'sender',
                select: 'name avatar',
            }
        }
    ])

    chat.lastMessage = newMessage._id
    await chat.save()

    //websocket emit the new Message to the chat room
    emitNewMessageToChatRoom(userId, chatId, newMessage);

    //websocket emit the lastmessage to members (personnal room user)
    const allParticipantIds = chat.participants.map((id) => id.toString());
    emitLastMessageToParticipants(allParticipantIds, chatId, newMessage);

    if (!chat.isGroup || !content) {
        // Mentions only apply to group messages.
    } else {
        const participants = await UserModel.find({ _id: { $in: chat.participants } }).select("name")
        const sender = await UserModel.findById(userId).select("name")
        for (const participant of participants) {
            if (
                participant._id.toString() !== userId &&
                content.includes(`@${participant.name}`)
            ) {
                emitMentionNotification(participant._id.toString(), {
                    chatId,
                    messageId: newMessage._id.toString(),
                    senderName: sender?.name || "Someone",
                    content,
                })
            }
        }
    }

    let aiResponse: any = null
    if (chat.isAiChat) {
        aiResponse = await getAIResponse(chatId, userId)
        if (aiResponse) {
            chat.lastMessage = aiResponse._id as mongoose.Types.ObjectId
            await chat.save()
        }
    }

    return {
        userMessage: newMessage,
        aiResponse,
        chat,
        // isAiChat: chat.isAiChat,
    }
}

async function getAIResponse(chatId: string, userId: string) {
    const whopAi = await UserModel.findOne({ isAI: true })
    if (!whopAi) throw new NotFoundException("AI user not found")

    const chatHistory = await getChatHistory(chatId)
    const formattedMessages: ModelMessage[] = chatHistory.map(
        (msg: any) => {
            const role = msg.sender.isAI ? "assistant" : "user"
            const parts: any[] = []

            if (msg.image) {
                const mediaType = msg.image.match(/^data:([^;]+);base64,/)?.[1]
                    || "image/png"
                parts.push({
                    type: "file",
                    data: msg.image,
                    mediaType,
                    fileName: "image.png"
                })

                if (!msg.content) {
                    parts.push({
                        type: "text",
                        text: "Describe what you see in the image",
                    })
                }
            }

            if (msg.content) {
                parts.push({
                    type: "text",
                    text: msg.replyTo
                        ? `[Replying to: "${msg.replyTo.content}"]\n${msg.content}`
                        : msg.content,
                })
            }

            return { role, content: parts }
        }
    )

    const result = await streamText({
        model: google("gemini-2.5-flash"),
        messages: formattedMessages,
        system:
            "You are Whop AI, a helpful and friendly assistant. Respond only with text and attend to the last user message only."
    })

    let fullResponse = ""
    for await (const chunk of result.textStream) {
        emitChatAI({ chatId, chunk, sender: whopAi, done: false, message: null })
        fullResponse += chunk
    }

    if (!fullResponse.trim()) return null
    const aiMessage = await MessageModel.create({
        chatId, sender: whopAi._id, content: fullResponse,
    })

    await aiMessage.populate("sender", "name avatar isAI")

    emitChatAI({ chatId, chunk: null, sender: whopAi, done: true, message: aiMessage })

    emitLastMessageToParticipants([userId], chatId, aiMessage)

    return aiMessage
}

async function getChatHistory(chatId: string) {
    const messages = await MessageModel.find({ chatId })
        .populate("sender", "isAI")
        .populate("replyTo", "content")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()

    return messages.reverse()
}

export const editMessageService = async (
    userId: string,
    messageId: string,
    content: string,
) => {
    const message = await MessageModel.findOne({
        _id: messageId,
        sender: userId,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    })

    if (!message) throw new NotFoundException("Message not found or unauthorized")

    message.content = content
    message.isEdited = true
    await message.save()
    await message.populate([
        { path: 'sender', select: 'name avatar isAI' },
        {
            path: 'replyTo',
            select: 'content image sender',
            populate: { path: 'sender', select: 'name avatar isAI' },
        },
    ])

    emitUpdatedMessageToChatRoom(message.chatId.toString(), message)

    const chat = await ChatModel.findById(message.chatId)
    if (chat?.lastMessage?.toString() === message._id.toString()) {
        const participantIds = chat.participants.map((id) => id.toString())
        emitLastMessageToParticipants(participantIds, chat._id.toString(), message)
    }

    return message
}

export const deleteMessageService = async (userId: string, messageId: string) => {
    const message = await MessageModel.findOne({ _id: messageId, sender: userId })
    if (!message) throw new NotFoundException("Message not found or unauthorized")
    message.isDeleted = true
    message.deletedAt = new Date()
    message.content = null
    message.image = null
    await message.save()
    await message.populate([
        { path: 'sender', select: 'name avatar isAI' },
        {
            path: 'replyTo',
            select: 'content image sender',
            populate: { path: 'sender', select: 'name avatar isAI' },
        },
    ])
    const chat = await ChatModel.findById(message.chatId)
    if (chat?.lastMessage?.toString() === message._id.toString()) {
        const replacement = await MessageModel.findOne({ chatId: message.chatId, isDeleted: false })
            .sort({ createdAt: -1 })
        chat.lastMessage = replacement?._id || null
        await chat.save()
        if (replacement) await replacement.populate("sender", "name avatar isAI")
        emitLastMessageToParticipants(chat.participants.map((id) => id.toString()), chat._id.toString(), replacement)
    }
    emitUpdatedMessageToChatRoom(message.chatId.toString(), message)
    return message
}

export const toggleMessageReactionService = async (userId: string, messageId: string, emoji: string) => {
    const message = await MessageModel.findOne({
        _id: messageId,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    })
    if (!message) throw new NotFoundException("Message not found")
    await validateChatParticipant(message.chatId.toString(), userId)
    const reactions = message.reactions || []
    const existing = reactions.find((reaction) => reaction.userId.toString() === userId)
    if (existing) {
        if (existing.emoji === emoji) message.reactions = reactions.filter((reaction) => reaction.userId.toString() !== userId)
        else existing.emoji = emoji
    } else {
        message.reactions = [...reactions, { userId: new mongoose.Types.ObjectId(userId), emoji }]
    }
    await message.save()
    await message.populate([
        { path: 'sender', select: 'name avatar isAI' },
        {
            path: 'replyTo',
            select: 'content image sender isDeleted',
            populate: { path: 'sender', select: 'name avatar isAI' },
        },
    ])
    emitUpdatedMessageToChatRoom(message.chatId.toString(), message)
    return message
}

export const searchMessagesService = async (
    userId: string,
    query: { chatId: string; q: string; page: number; limit: number },
) => {
    await validateChatParticipant(query.chatId, userId)
    const filter = {
        chatId: query.chatId,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        $text: { $search: query.q },
    }
    const [messages, total] = await Promise.all([
        MessageModel.find(filter).populate("sender", "name avatar isAI")
            .sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit),
        MessageModel.countDocuments(filter),
    ])
    return { messages, page: query.page, hasMore: query.page * query.limit < total }
}

export const markMessagesReadService = async (userId: string, chatId: string, upToMessageId?: string) => {
    await validateChatParticipant(chatId, userId)
    const boundary = upToMessageId ? await MessageModel.findOne({ _id: upToMessageId, chatId }) : null
    const filter: any = { chatId, sender: { $ne: userId }, isDeleted: false }
    if (boundary) filter.createdAt = { $lte: boundary.createdAt }
    const messages = await MessageModel.find(filter)
    await Promise.all(messages.map(async (message) => {
        const read = message.readBy.find((entry) => entry.userId.toString() === userId)
        if (read) read.readAt = new Date()
        else message.readBy.push({ userId: new mongoose.Types.ObjectId(userId), readAt: new Date() })
        await message.save()
        emitUpdatedMessageToChatRoom(chatId, message)
    }))
    return messages
}