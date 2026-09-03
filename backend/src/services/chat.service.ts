import ChatModel from "../models/chat.model";
import MessageModel from "../models/message.model";
import UserModel from "../models/user.model";
import { BadRequestException, NotFoundException } from "../utils/app-error";
import { emitNewChatToParticipants } from '../lib/socket'

export const createChatService = async (
    userId: string,
    body: {
        participantId?: string
        isGroup?: boolean
        participants?: string[]
        groupName?: string
    }
) => {
    const { participantId, isGroup, participants, groupName } = body;

    let chat
    let allParticipantIds: string[] = []

    if (isGroup && participants?.length && groupName) {
        const uniqueParticipants = [...new Set(participants)]
        if (uniqueParticipants.includes(userId)) {
            throw new BadRequestException('The chat creator is added automatically')
        }

        const participantCount = await UserModel.countDocuments({
            _id: { $in: uniqueParticipants },
        })
        if (participantCount !== uniqueParticipants.length) {
            throw new NotFoundException('One or more participants were not found')
        }

        allParticipantIds = [userId, ...uniqueParticipants]
        chat = await ChatModel.create({
            participants: allParticipantIds,
            isGroup: true,
            groupName,
            createdBy: userId,
        })
    } else if (participantId) {
        const otherUser = await UserModel.findById(participantId)
        if (!otherUser) throw new NotFoundException('User not found')

        allParticipantIds = [userId, participantId]
        const existingChat = await ChatModel.findOne({
            participants: {
                $all: allParticipantIds,
                $size: 2,
            }
        })
            .populate('participants', 'name avatar isAI')
            .populate({
                path: 'lastMessage',
                populate: { path: 'sender', select: 'name avatar isAI' },
            })

        if (existingChat) return existingChat

        chat = await ChatModel.create({
            participants: allParticipantIds,
            isGroup: false,
            createdBy: userId,
        })
    }

    if (!chat) {
        throw new BadRequestException('Provide a participant or valid group details')
    }

    // Implement socket
    const populatedChat = await chat.populate("participants", "name avatar isAI")
    const participantIdStrings = populatedChat.participants.map((p) => {
        return p._id?.toString()
    })

    emitNewChatToParticipants(participantIdStrings, populatedChat)

    return populatedChat
}

export const getUserChatsService = async (userId: string) => {
    const chats = await ChatModel.find({
        participants: {
            $in: [userId]
        }
    })
        .populate("participants", "name avatar")
        .populate({
            path: 'lastMessage',
            populate: {
                path: 'sender',
                select: 'name avatar isAI'
            }
        })
        .sort({ updatedAt: -1 })

    return chats
}

export const getSingleChatService = async (chatId: string, userId: string, page = 1, requestedLimit = 30) => {
    const chat = await ChatModel.findOne({
        _id: chatId,
        participants: {
            $in: [userId],
        },
    }).populate('participants', 'name avatar isAI')

    if (!chat) {
        throw new BadRequestException('Chat not found or you are not authorized to view this chat')
    }

    page = Math.max(1, page)
    const limit = Math.min(50, Math.max(1, requestedLimit))
    const total = await MessageModel.countDocuments({ chatId })
    const messages = await MessageModel.find({ chatId })
        .populate('sender', 'name avatar isAI')
        .populate({
            path: 'replyTo',
            select: 'content image sender',
            populate: {
                path: 'sender',
                select: 'name avatar isAI',
            },
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
    messages.reverse()

    return { chat, messages, page, hasMore: page * limit < total }
}

export const validateChatParticipant = async (chatId: string, userId: string) => {
    const chat = await ChatModel.findOne({
        _id: chatId,
        participants: { $in: [userId] }
    })
    if (!chat) throw new BadRequestException('User not a participant in chat')
    return chat
}