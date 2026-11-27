import type { Request, Response } from 'express';
import prisma from '../../../prisma/prisma-client';
import {
    createSeatMapSchema,
    createVenueSchema,
    parsePositiveId,
    updateSeatsSchema,
    type CreateSeatMapInput,
    type CreateVenueInput,
    type UpdateSeatsInput,
} from './venue.schema';
import { cloneSeatMap, updateSeats } from './seat-map-edit.service';
import { createSeatMap, createVenue, getSeatMap, listVenues, publishSeatMap } from './venue.service';

const invalidBody = (res: Response, details?: unknown) => (
    res.status(400).json({ message: 'Invalid request', details })
);

export const listVenuesController = async (_req: Request, res: Response) => (
    res.json({ items: await listVenues(prisma) })
);

export const createVenueController = async (req: Request, res: Response) => {
    const parsed = createVenueSchema.safeParse(req.body);
    if (!parsed.success) return invalidBody(res, parsed.error.flatten());

    return res.status(201).json(await createVenue(prisma, parsed.data as CreateVenueInput));
};

export const createSeatMapController = async (req: Request, res: Response) => {
    const venueId = parsePositiveId(req.params.venueId);
    const parsed = createSeatMapSchema.safeParse(req.body);
    if (!venueId || !parsed.success) return invalidBody(res, parsed.success ? undefined : parsed.error.flatten());

    const result = await createSeatMap(prisma, venueId, parsed.data as CreateSeatMapInput);
    if (result.kind === 'venue_not_found') return res.status(404).json({ message: 'Venue not found' });

    return res.status(201).json(await getSeatMap(prisma, result.seatMapId));
};

export const getSeatMapController = async (req: Request, res: Response) => {
    const seatMapId = parsePositiveId(req.params.seatMapId);
    const seatMap = seatMapId ? await getSeatMap(prisma, seatMapId) : null;
    if (!seatMap) return res.status(404).json({ message: 'Seat map not found' });

    return res.json(seatMap);
};

export const publishSeatMapController = async (req: Request, res: Response) => {
    const seatMapId = parsePositiveId(req.params.seatMapId);
    if (!seatMapId) return res.status(404).json({ message: 'Seat map not found' });

    const published = await publishSeatMap(prisma, seatMapId, req.user?.id);
    if (!published) return res.status(409).json({ message: 'Seat map is not a draft or has no seats' });

    return res.json(await getSeatMap(prisma, seatMapId));
};

export const updateSeatsController = async (req: Request, res: Response) => {
    const seatMapId = parsePositiveId(req.params.seatMapId);
    const parsed = updateSeatsSchema.safeParse(req.body);
    if (!seatMapId || !parsed.success) return invalidBody(res, parsed.success ? undefined : parsed.error.flatten());

    const result = await updateSeats(prisma, seatMapId, parsed.data as UpdateSeatsInput);
    if (result.kind === 'rejected') {
        const status = result.reason === 'SEAT_MAP_NOT_FOUND' ? 404 : 409;
        return res.status(status).json({ message: 'Seats cannot be changed', reason: result.reason });
    }
    return res.json(await getSeatMap(prisma, seatMapId));
};

export const cloneSeatMapController = async (req: Request, res: Response) => {
    const seatMapId = parsePositiveId(req.params.seatMapId);
    const cloneId = seatMapId ? await cloneSeatMap(prisma, seatMapId) : null;
    if (!cloneId) return res.status(404).json({ message: 'Seat map not found' });

    return res.status(201).json(await getSeatMap(prisma, cloneId));
};
