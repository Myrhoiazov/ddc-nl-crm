import express from "express";
import { createUserController, deleteUserByIdController, gettAllUsersController, getUserByIdController, updateUserController } from "../controllers/controller.Users";
import { asyncHandler, isToken, requireOwnerOrRole, requireRole } from "../middlewares/middleware.Auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.get("/", asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(gettAllUsersController));
router.post("/", asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(createUserController));
router.get("/:id", asyncHandler(isToken), requireOwnerOrRole(UserRole.ADMIN), asyncHandler(getUserByIdController));
router.delete("/:id", asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(deleteUserByIdController));
router.patch("/:id", asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(updateUserController));

export default router;
