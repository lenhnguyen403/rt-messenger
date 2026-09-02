import { Router } from "express";
import authRoutes from "./auth.route";
import userRoutes from "./user.route";
import chatRoutes from "./chat.route";

const router = Router()
router.use('/auth', authRoutes)
router.use('/chat', chatRoutes)
router.use('/user', userRoutes)

export default router