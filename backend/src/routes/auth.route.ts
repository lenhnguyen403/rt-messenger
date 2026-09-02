import { Router } from "express";
import {
    loginController,
    logoutController,
    registerController,
    authStatusController
} from '../controllers/auth.controller'
import { passportAuthenticateJwt } from "../config/password.config";

const authRoutes = Router();

authRoutes
    .post('/register', registerController)
    .post("/login", loginController)
    .post("/logout", logoutController)
    .get('/status', passportAuthenticateJwt, authStatusController);

export default authRoutes;