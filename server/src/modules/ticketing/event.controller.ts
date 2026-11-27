import type { Request, Response } from 'express';
import prisma from '../../../prisma/prisma-client';
import {
    createEventSchema,
    createSessionSchema,
    sessionStatusSchema,
    type CreateEventInput,
    type CreateSessionInput,
    type ManualSessionStatus,
} from './event.schema';
import { changeSessionStatus, createEvent, createSession, getSessionDetail, listEvents, publishSession } from './event.service';
import { parsePositiveId } from './venue.schema';

const invalidBody = (res: Response, details?: unknown) => (
    res.status(400).json({ message: 'Invalid request', details })
);

const sessionNotFound = (res: Response) => res.status(404).json({ message: 'Session not found' });

export const listEventsController = async (_req: Request, res: Response) => (
    res.json({ items: await listEvents(prisma) })
);

export const createEventController = async (req: Request, res: Response) => {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) return invalidBody(res, parsed.error.flatten());

    return res.status(201).json(await createEvent(prisma, parsed.data as CreateEventInput, req.user?.id));
};

export const createSessionController = async (req: Request, res: Response) => {
    const eventId = parsePositiveId(req.params.eventId);
    const parsed = createSessionSchema.safeParse(req.body);
    if (!eventId || !parsed.success) return invalidBody(res, parsed.success ? undefined : parsed.error.flatten());

    const result = await createSession(prisma, eventId, parsed.data as CreateSessionInput);
    if (result.kind === 'rejected') {
        return res.status(result.reason === 'EVENT_NOT_FOUND' ? 404 : 409).json({ message: 'Session rejected', ...result });
    }
    return res.status(201).json(await getSessionDetail(prisma, result.sessionId));
};

export const getSessionController = async (req: Request, res: Response) => {
    const sessionId = parsePositiveId(req.params.sessionId);
    const session = sessionId ? await getSessionDetail(prisma, sessionId) : null;
    return session ? res.json(session) : sessionNotFound(res);
};

export const publishSessionController = async (req: Request, res: Response) => {
    const sessionId = parsePositiveId(req.params.sessionId);
    if (!sessionId) return sessionNotFound(res);

    const result = await publishSession(prisma, sessionId);
    if (result.kind === 'rejected') return res.status(409).json({ message: 'Session cannot be published', reason: result.reason });

    return res.json(await getSessionDetail(prisma, sessionId));
};

export const changeSessionStatusController = async (req: Request, res: Response) => {
    const sessionId = parsePositiveId(req.params.sessionId);
    const parsed = sessionStatusSchema.safeParse(req.body);
    if (!sessionId || !parsed.success) return invalidBody(res);

    const changed = await changeSessionStatus(prisma, sessionId, parsed.data.status as ManualSessionStatus);
    if (!changed) return res.status(409).json({ message: 'Status change is not allowed from the current status' });

    return res.json(await getSessionDetail(prisma, sessionId));
};
