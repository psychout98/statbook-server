import AuthController from "../controllers/authController";
import express from "express";

export const router = express.Router()

const authController = new AuthController()

router.post("/register", authController.register.bind(authController))

router.post("/login", authController.login.bind(authController))