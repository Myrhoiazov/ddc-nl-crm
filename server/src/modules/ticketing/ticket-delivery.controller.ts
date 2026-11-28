import type { Request, Response } from 'express';
import prisma from '../../../prisma/prisma-client';
import { requestResendDelivery } from './ticket-delivery.commands';
import { parsePositiveId } from './venue.schema';

// Повторная отправка билетов персоналом. Письмо ставится в outbox и уходит воркером;
// адрес берётся из заказа, изменить получателя здесь нельзя.
export const resendTicketsController = async (req: Request, res: Response) => {
    const orderId = parsePositiveId(req.params.orderId);
    const actorId = req.user?.id;
    if (!orderId || !actorId) return res.status(400).json({ message: 'Invalid request' });

    const queued = await requestResendDelivery({ prisma }, { orderId, actorId });
    return queued
        ? res.status(202).json({ queued: true })
        : res.status(404).json({ message: 'Paid order not found' });
};
