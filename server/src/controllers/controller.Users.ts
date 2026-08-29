import { NextFunction, Request, Response } from 'express';
import {
    createUser,
    deleteUserById,
    getAllUsers,
    getUserByEmail,
    getUserById,
    updateUserSecurity,
} from '../services/service.Users';
import ApiError from '../helpers/ApiError';

import { hashPassword, isPasswordAllowed } from '../services/service.Password';
import { AuthSecurityEventType, UserRole } from '@prisma/client';
import { recordAuthSecurityEvent } from '../services/service.AuthSecurityAudit';

/**
 * Controller to fetch all users.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with users or error message
 */
export const gettAllUsersController = async (req: Request, res: Response) => {
    try {
        const users = await getAllUsers();
        return res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
/**
 * Controller to delete a user by ID.
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with status or error message
 */
export const deleteUserByIdController = async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }
    if (req.user?.id === userId) {
        return res.status(400).json({ message: 'Нельзя удалить собственный аккаунт' });
    }

    try {
        const deleteUser = await deleteUserById(userId);
        if (!deleteUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        await recordAuthSecurityEvent({
            type: AuthSecurityEventType.ACCOUNT_DELETED,
            actorUserId: req.user?.id,
            targetUserId: deleteUser.id,
            req,
            metadata: { email: deleteUser.email, role: deleteUser.role },
        });
        return res.status(200).json(deleteUser);
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const updateUserController = async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    const { role, isEnabled } = req.body;

    if (!userId || (role === undefined && isEnabled === undefined)) {
        return res.status(400).json({ message: 'Role or account state is required' });
    }
    if (role !== undefined && !Object.values(UserRole).includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }
    if (isEnabled !== undefined && typeof isEnabled !== 'boolean') {
        return res.status(400).json({ message: 'Invalid account state' });
    }
    if (req.user?.id === userId && isEnabled === false) {
        return res.status(400).json({ message: 'Нельзя заблокировать собственный аккаунт' });
    }
    if (req.user?.id === userId && role !== undefined && role !== req.user.role) {
        return res.status(400).json({ message: 'Нельзя изменить собственную роль' });
    }

    try {
        const previousUser = await getUserById(userId);
        if (!previousUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        const updatedUser = await updateUserSecurity(userId, { role, isEnabled });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (role !== undefined && role !== previousUser.role) {
            await recordAuthSecurityEvent({
                type: AuthSecurityEventType.ROLE_CHANGED,
                actorUserId: req.user?.id,
                targetUserId: userId,
                req,
                metadata: { from: previousUser.role, to: role },
            });
            await recordAuthSecurityEvent({
                type: AuthSecurityEventType.SESSION_REVOKED,
                actorUserId: req.user?.id,
                targetUserId: userId,
                req,
                metadata: { reason: 'ROLE_CHANGED' },
            });
        }
        if (isEnabled !== undefined && isEnabled !== previousUser.isEnabled) {
            await recordAuthSecurityEvent({
                type: isEnabled
                    ? AuthSecurityEventType.ACCOUNT_ENABLED
                    : AuthSecurityEventType.ACCOUNT_DISABLED,
                actorUserId: req.user?.id,
                targetUserId: userId,
                req,
                metadata: { previous: previousUser.isEnabled, current: isEnabled },
            });
            await recordAuthSecurityEvent({
                type: AuthSecurityEventType.SESSION_REVOKED,
                actorUserId: req.user?.id,
                targetUserId: userId,
                req,
                metadata: { reason: isEnabled ? 'ACCOUNT_ENABLED' : 'ACCOUNT_DISABLED' },
            });
        }
        return res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const getUserByIdController = async (req: Request, res: Response) => {
    const userId = Number(req.params.id);

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        const User = await getUserById(userId);
        if (!User) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { authVersion: _authVersion, ...safeUser } = User;
        return res.status(200).json(safeUser);
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }

}

export const createUserController = async (req: Request, res: Response) => {
    const { firstName, lastName, email, password, role } = req.body;



    if (!firstName || !email || !password) {
        throw ApiError.BadRequest('All fields are required');
    }
    if (!isPasswordAllowed(password)) {
        throw ApiError.BadRequest('Пароль должен содержать от 12 до 128 символов');
    }

    try {
        const normalizedEmail = String(email).trim().toLowerCase();
        const existingUser = await getUserByEmail(normalizedEmail);
        if (existingUser) {
            throw ApiError.BadRequest('User already exists');
        }

        const hashedPassword = await hashPassword(password);
        const newUser = await createUser({
            firstName,
            role,
            lastName,
            salt: null,
            email: normalizedEmail,
            password: hashedPassword,
            isEnabled: true,
        });

        await recordAuthSecurityEvent({
            type: AuthSecurityEventType.ACCOUNT_CREATED,
            actorUserId: req.user?.id,
            targetUserId: newUser.id,
            req,
            metadata: { email: newUser.email, role: newUser.role },
        });

        return res.status(201).json(newUser);
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}
