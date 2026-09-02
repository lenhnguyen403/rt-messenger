import { Router } from "express";
import { passportAuthenticateJwt } from "../config/password.config";
import { getUsersController } from "../controllers/user.controller";

const userRoutes = Router()
    .use(passportAuthenticateJwt)
    .get('/all', getUsersController)

export default userRoutes  