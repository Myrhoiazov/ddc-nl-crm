import express from "express";
import { csrf, login, logout, refresh, resendTwoFactor, verifyTwoFactor } from "../controllers/controller.Auth";
import { asyncHandler, isToken } from "../middlewares/middleware.Auth"
import { validateSchema } from "../middlewares/middleware.ValidateSchema";
import { loginSchema, twoFactorVerifySchema } from "../schemas/schema.auth";
import { loginRateLimit } from "../middlewares/middleware.LoginRateLimit";
import { twoFactorRateLimit } from "../middlewares/middleware.TwoFactorRateLimit";

const router = express.Router();

router.post("/login", loginRateLimit, validateSchema(loginSchema), asyncHandler(login));
router.post("/login/2fa/verify", twoFactorRateLimit, validateSchema(twoFactorVerifySchema), asyncHandler(verifyTwoFactor));
router.post("/login/2fa/resend", twoFactorRateLimit, asyncHandler(resendTwoFactor));
router.get("/csrf", asyncHandler(isToken), asyncHandler(csrf));
router.post("/logout", asyncHandler(logout));
router.post('/refresh', asyncHandler(refresh));

export default router
