import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { editMessageSchema, messageSearchSchema, reactionSchema, readMessagesSchema, sendMessageSchema } from "../validators/message.validator";
import { editMessageService, markMessagesReadService, searchMessagesService, sendMessageService, toggleMessageReactionService, deleteMessageService } from "../services/message.service";
import { UnauthorizedException } from "../utils/app-error";

export const sendMessageController = asyncHandler(
    async (req: Request, res: Response) => {
        const userId = req.user?._id?.toString()
        if (!userId) throw new UnauthorizedException()
        const body = sendMessageSchema.parse(req.body)
        const result = await sendMessageService(userId, body)

        return res.status(HTTPSTATUS.OK).json({
            message: "Message sent successfully",
            ...result,
        })
    }
)

export const editMessageController = asyncHandler(
    async (req: Request, res: Response) => {
        const userId = req.user?._id?.toString()
        if (!userId) throw new UnauthorizedException()
        const { content } = editMessageSchema.parse(req.body)
        const messageId = typeof req.params.id === "string" ? req.params.id : req.params.id[0]
        const message = await editMessageService(userId, messageId, content)

        return res.status(HTTPSTATUS.OK).json({
            message: "Message updated successfully",
            updatedMessage: message,
        })
    }
)

export const deleteMessageController = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id?.toString()
    if (!userId) throw new UnauthorizedException()
    const messageId = typeof req.params.id === "string" ? req.params.id : req.params.id[0]
    const deletedMessage = await deleteMessageService(userId, messageId)
    return res.status(HTTPSTATUS.OK).json({ message: "Message deleted successfully", deletedMessage })
})

export const toggleMessageReactionController = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id?.toString()
    if (!userId) throw new UnauthorizedException()
    const messageId = typeof req.params.id === "string" ? req.params.id : req.params.id[0]
    const { emoji } = reactionSchema.parse(req.body)
    const updatedMessage = await toggleMessageReactionService(userId, messageId, emoji)
    return res.status(HTTPSTATUS.OK).json({ updatedMessage })
})

export const searchMessagesController = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id?.toString()
    if (!userId) throw new UnauthorizedException()
    const query = messageSearchSchema.parse(req.query)
    const result = await searchMessagesService(userId, query)
    return res.status(HTTPSTATUS.OK).json(result)
})

export const markMessagesReadController = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id?.toString()
    if (!userId) throw new UnauthorizedException()
    const body = readMessagesSchema.parse({ ...req.body, chatId: req.params.id })
    const messages = await markMessagesReadService(userId, body.chatId, body.upToMessageId)
    return res.status(HTTPSTATUS.OK).json({ messages })
})