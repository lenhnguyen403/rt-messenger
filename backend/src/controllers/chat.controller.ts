import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { chatIdSchema, createChatSchema } from "../validators/chat.validator";
import {
    createChatService,
    getUserChatsService,
    getSingleChatService
} from '../services/chat.service'
import { UnauthorizedException } from '../utils/app-error';

export const createChatController = asyncHandler(
    async (req: Request, res: Response) => {
        const userId = req.user?._id?.toString()
        if (!userId) throw new UnauthorizedException()
        const body = createChatSchema.parse(req.body)
        const chat = await createChatService(userId, body)

        return res.status(HTTPSTATUS.OK).json({
            message: 'Chat created or retrieved successfully',
            chat,
        })
    }
)

export const getUserChatsController = asyncHandler(
    async (req: Request, res: Response) => {
        const userId = req.user?._id?.toString()
        if (!userId) throw new UnauthorizedException()
        const chats = await getUserChatsService(userId)

        return res.status(HTTPSTATUS.OK).json({
            message: "User chats retrieved successfully",
            chats,
        })
    }
)

export const getSingleChatController = asyncHandler(
    async (req: Request, res: Response) => {
        const userId = req.user?._id?.toString()
        if (!userId) throw new UnauthorizedException()
        const { id } = chatIdSchema.parse(req.params)
        const page = Number(req.query.page) || 1
        const limit = Number(req.query.limit) || 30
        const { chat, messages, hasMore } = await getSingleChatService(id, userId, page, limit)

        return res.status(HTTPSTATUS.OK).json({
            message: "User chats retrieved successfully",
            chat,
            messages,
            page,
            hasMore,
        })
    }
)