import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { getUsersService } from "../services/user.service";
import { UnauthorizedException } from "../utils/app-error";

export const getUsersController = asyncHandler(
    async (req: Request, res: Response) => {
        const userId = req.user?._id?.toString()
        if (!userId) throw new UnauthorizedException()

        const users = await getUsersService(userId)

        return res.status(HTTPSTATUS.OK).json({
            message: 'Users retrieved successfully',
            users
        })
    }
)