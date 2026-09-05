import assert from 'node:assert/strict';
import test from 'node:test';
import { InvoiceDocumentType, InvoiceStatus } from '@prisma/client';
import { buildAdjustmentInvoiceData } from './controller.Invoices';

const original = {
    id: 42,
    number: 'INV-2026-007',
    documentType: InvoiceDocumentType.INVOICE,
    status: InvoiceStatus.ISSUED,
    clientId: 12,
    billToName: 'Ada Lovelace',
    billToEmail: 'ada@example.com',
    dueDate: new Date('2026-10-01T00:00:00.000Z'),
    currency: 'EUR',
    totalCents: 10000,
    paidAmountCents: 2500,
    creditedAmountCents: 0,
    issuerName: 'Talent Center DDC',
    issuerAddress: 'Studio 1',
    issuerEmail: 'billing@example.com',
    bankName: 'DDC Bank',
    iban: 'NL91ABNA0417164300',
    showPaymentButton: true,
    showPaymentQr: true,
};

const issueDate = new Date('2026-09-05T12:00:00.000Z');

test('buildAdjustmentInvoiceData creates a paid credit note without payment controls', () => {
    const data = buildAdjustmentInvoiceData({
        number: 'CRN-2026-001',
        isCredit: true,
        issueDate,
        original,
        data: { kind: 'CREDIT', amountCents: 3000, reason: 'Correction' },
        actorId: 7,
    });

    assert.equal(data.documentType, InvoiceDocumentType.CREDIT_NOTE);
    assert.equal(data.status, InvoiceStatus.PAID);
    assert.equal(data.parentInvoiceId, original.id);
    assert.equal(data.dueDate, null);
    assert.equal(data.paidAt, issueDate);
    assert.equal(data.balanceDueCents, 0);
    assert.equal(data.showPaymentButton, false);
    assert.equal(data.showPaymentQr, false);
    assert.equal(data.items.create.description, 'Кредит-нота к INV-2026-007: Correction');
});

test('buildAdjustmentInvoiceData creates an issued debit note that keeps payment controls', () => {
    const data = buildAdjustmentInvoiceData({
        number: 'DBN-2026-001',
        isCredit: false,
        issueDate,
        original,
        data: { kind: 'DEBIT', amountCents: 1500, reason: 'Extra class' },
        actorId: undefined,
    });

    assert.equal(data.documentType, InvoiceDocumentType.DEBIT_NOTE);
    assert.equal(data.status, InvoiceStatus.ISSUED);
    assert.equal(data.dueDate, original.dueDate);
    assert.equal(data.paidAt, null);
    assert.equal(data.balanceDueCents, 1500);
    assert.equal(data.showPaymentButton, true);
    assert.equal(data.showPaymentQr, true);
    assert.equal(data.createdById, undefined);
    assert.equal(data.items.create.description, 'Корректировка к INV-2026-007: Extra class');
});
