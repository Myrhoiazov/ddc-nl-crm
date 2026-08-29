import { Request, Response, NextFunction } from 'express';
import ApiError from '../helpers/ApiError';
import { logger } from '../logger';

export default function errorMiddleware(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): any {
    if (err instanceof ApiError) {
        logger.error(`Error: ${err.message} | Path: ${req.path} | Stack: ${err.stack}`);
        return res.status(err.status).json({ message: err.message, errors: err.errors });
    }

    console.error('Unexpected error:', err);
    return res.status(500).json({ message: 'Непредвиденная ошибка!' });
}
