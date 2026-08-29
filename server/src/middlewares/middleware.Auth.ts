import { NextFunction, Request, Response } from "express";
import { get, merge } from "lodash";
import { getUserByOpaqueSessionToken } from "../services/service.Token";
import { UserRole } from "@prisma/client";

const cookieName = () => process.env.COOKIE_NAME || 'ddc_refresh';

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
    const sessionToken = req.cookies[cookieName()];

    if (!sessionToken) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const session = await getUserByOpaqueSessionToken(sessionToken)
        if (!session?.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        merge(req, { user: session.user, token: sessionToken });

        return next();
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);


export const isOwner = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params
    if (!id) {
        return res.status(400).json({ message: "User ID is required" });
    }
    const userId = get(req, "params.id", null);
    const currentUser = get(req, "user", null);

    if (!currentUser || !userId || String(currentUser.id) !== String(userId)) {
        return res.status(403).json({ message: "Forbidden" });
    }

    next();
}

export const requireRole = (...roles: UserRole[]) => (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (!req.user || !roles.includes(req.user.role)) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    next();
};

export const requireOwnerOrRole = (...roles: UserRole[]) => (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const targetUserId = Number(req.params.id);
    if (!req.user || !Number.isInteger(targetUserId)) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    if (req.user.id !== targetUserId && !roles.includes(req.user.role)) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    next();
};

export const isToken = isAuthenticated;
