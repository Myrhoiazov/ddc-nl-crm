import express from "express";
import {
    getProfile,
    updateProfileController,
    changePasswordController,
    listSessionsController,
    revokeSessionController,
    revokeOtherSessionsController,
} from "../controllers/controller.Profiles"
import { asyncHandler, isToken, requireOwnerOrRole } from "../middlewares/middleware.Auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.get('/', asyncHandler(isToken), asyncHandler(getProfile));
router.get('/sessions', asyncHandler(isToken), asyncHandler(listSessionsController));
router.delete('/sessions', asyncHandler(isToken), asyncHandler(revokeOtherSessionsController));
router.delete('/sessions/:sessionId', asyncHandler(isToken), asyncHandler(revokeSessionController));
router.put('/:id', asyncHandler(isToken), requireOwnerOrRole(UserRole.ADMIN), asyncHandler(updateProfileController));
router.put('/:id/password', asyncHandler(isToken), requireOwnerOrRole(UserRole.ADMIN), asyncHandler(changePasswordController));

export default router;
