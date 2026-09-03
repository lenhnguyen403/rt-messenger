import { Router } from "express";
import { passportAuthenticateJwt } from "../config/password.config";
import {
    createChatController,
    getSingleChatController,
    getUserChatsController
} from '../controllers/chat.controller'
import { deleteMessageController, editMessageController, markMessagesReadController, searchMessagesController, sendMessageController, toggleMessageReactionController } from "../controllers/message.controller";

const chatRoutes = Router()
    .use(passportAuthenticateJwt)
    .post('/create', createChatController)
    .post('/message/send', sendMessageController)
    .put('/message/:id', editMessageController)
    .delete('/message/:id', deleteMessageController)
    .post('/message/:id/reaction', toggleMessageReactionController)
    .get('/message/search', searchMessagesController)
    .post('/:id/read', markMessagesReadController)
    .get('/all', getUserChatsController)
    .get("/:id", getSingleChatController)

export default chatRoutes