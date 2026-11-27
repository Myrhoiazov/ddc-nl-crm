import express from 'express';
import { asyncHandler, isToken, requireStaff } from '../auth/auth.middleware';
import {
    confirmPaidInvoice,
    createInvoice,
    createPaidInvoice,
    createInvoiceAdjustment,
    createInvoicePaymentLink,
    downloadPublicInvoicePdf,
    downloadInvoicePdf,
    getInvoiceDeliveries,
    getInvoiceHistory,
    getInvoices,
    recordInvoicePayment,
    sendInvoice,
    syncOverdueInvoices,
    updateInvoice,
    updateInvoiceStatus,
    viewPublicInvoice,
} from './invoices.controller';

const router = express.Router();

router.get('/', asyncHandler(isToken), requireStaff, asyncHandler(getInvoices));
router.post('/sync-overdue', asyncHandler(isToken), requireStaff, asyncHandler(syncOverdueInvoices));
router.get('/public/:token', asyncHandler(viewPublicInvoice));
router.get('/public/:token/pdf', asyncHandler(downloadPublicInvoicePdf));
router.post('/', asyncHandler(isToken), requireStaff, asyncHandler(createInvoice));
router.post('/paid', asyncHandler(isToken), requireStaff, asyncHandler(createPaidInvoice));
router.put('/:id', asyncHandler(isToken), requireStaff, asyncHandler(updateInvoice));
router.post('/:id/confirm-paid', asyncHandler(isToken), requireStaff, asyncHandler(confirmPaidInvoice));
router.patch('/:id/status', asyncHandler(isToken), requireStaff, asyncHandler(updateInvoiceStatus));
router.post('/:id/payments', asyncHandler(isToken), requireStaff, asyncHandler(recordInvoicePayment));
router.post('/:id/mollie-payment-link', asyncHandler(isToken), requireStaff, asyncHandler(createInvoicePaymentLink));
router.post('/:id/send', asyncHandler(isToken), requireStaff, asyncHandler(sendInvoice));
router.get('/:id/deliveries', asyncHandler(isToken), requireStaff, asyncHandler(getInvoiceDeliveries));
router.post('/:id/adjustments', asyncHandler(isToken), requireStaff, asyncHandler(createInvoiceAdjustment));
router.get('/:id/history', asyncHandler(isToken), requireStaff, asyncHandler(getInvoiceHistory));
router.get('/:id/pdf', asyncHandler(isToken), requireStaff, asyncHandler(downloadInvoicePdf));

export default router;
