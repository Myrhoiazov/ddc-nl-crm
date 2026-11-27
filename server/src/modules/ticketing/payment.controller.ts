import type { Request, Response } from 'express';
import prisma from '../../../prisma/prisma-client';
import { getTicketPaymentGateway } from './payment.mollie-gateway';
import { isMolliePaymentId } from './payment.policy';
import { syncPayment } from './payment.service';
import { readPaymentConfig } from './ticketing.config';

export const mollieWebhookController = async (req: Request, res: Response) => {
    const id: unknown = req.body?.id;
    if (!isMolliePaymentId(id)) return res.status(400).send('Invalid payment id');

    const config = readPaymentConfig();
    if (!config) return res.status(503).send('Ticket payments are not available');

    await syncPayment({ prisma, gateway: getTicketPaymentGateway(), config }, id, 'WEBHOOK');
    return res.status(200).send('OK');
};
