import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import test from 'node:test';
import type { Request, Response } from 'express';
import { fromPartial } from '@total-typescript/shoehorn';
import prisma from '../../../prisma/prisma-client';
import * as mollieService from './payments.mollie.service';
import { deleteCustomerController } from './payments.controller';
import {
    MANDATE_DOCUMENTS_DIR,
    deleteMandateDocument,
    detectMandateDocumentMimeType,
    getMandateDocumentFile,
    listCustomerMandateDocuments,
    normalizeMandateDocumentCaption,
    removeMandateDocumentFiles,
    uploadMandateDocument,
} from './payments.mandate-documents.service';

const PDF = Buffer.from('%PDF-1.7\n%test');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 ')]);

function stub(t: test.TestContext, delegate: object, method: string, impl: (...args: any[]) => unknown) {
    const target = delegate as Record<string, unknown>;
    const original = target[method];
    target[method] = impl;
    t.after(() => { target[method] = original; });
}

const storedRow = {
    id: 7,
    originalName: 'mandaat.pdf',
    mimeType: 'application/pdf',
    sizeBytes: PDF.length,
    storagePath: 'abc.pdf',
    caption: 'Paper mandate from the mother',
    createdAt: new Date('2026-10-01T10:00:00Z'),
    mandate: { mollieId: 'mdt_1' },
};

test('detectMandateDocumentMimeType recognises PDF, PNG, JPEG and WebP by their signature', () => {
    assert.equal(detectMandateDocumentMimeType(PDF), 'application/pdf');
    assert.equal(detectMandateDocumentMimeType(PNG), 'image/png');
    assert.equal(detectMandateDocumentMimeType(JPEG), 'image/jpeg');
    assert.equal(detectMandateDocumentMimeType(WEBP), 'image/webp');
});

test('detectMandateDocumentMimeType rejects anything else, whatever the client claims', () => {
    assert.equal(detectMandateDocumentMimeType(Buffer.from('<html><script>alert(1)</script>')), null);
    assert.equal(detectMandateDocumentMimeType(Buffer.alloc(0)), null);
});

test('normalizeMandateDocumentCaption trims text and treats blank input as no caption', () => {
    assert.equal(normalizeMandateDocumentCaption('  Signed on paper  '), 'Signed on paper');
    assert.equal(normalizeMandateDocumentCaption('   '), null);
    assert.equal(normalizeMandateDocumentCaption(undefined), null);
});

test('normalizeMandateDocumentCaption rejects a caption longer than 500 characters', () => {
    assert.throws(() => normalizeMandateDocumentCaption('x'.repeat(501)), /500/);
});

test('uploadMandateDocument refuses a mandate that does not belong to the customer', async (t) => {
    stub(t, prisma.mandate, 'findFirst', async () => null);

    await assert.rejects(
        uploadMandateDocument({ customerId: 1, mandateMollieId: 'mdt_other', file: { originalname: 'a.pdf', buffer: PDF } }),
        (error: { status: number }) => error.status === 404,
    );
});

test('uploadMandateDocument refuses a file that is not a PDF or an image', async (t) => {
    stub(t, prisma.mandate, 'findFirst', async () => ({ id: 3 }));

    await assert.rejects(
        uploadMandateDocument({ customerId: 1, mandateMollieId: 'mdt_1', file: { originalname: 'a.pdf', buffer: Buffer.from('nope') } }),
        (error: { status: number }) => error.status === 400,
    );
});

test('uploadMandateDocument stores the file privately and links it to the mandate with its caption', async (t) => {
    let created: Record<string, unknown> | undefined;
    stub(t, prisma.mandate, 'findFirst', async () => ({ id: 3 }));
    stub(t, prisma.mandateDocument, 'create', async ({ data }: { data: Record<string, unknown> }) => {
        created = data;
        return { ...storedRow, ...data };
    });
    t.after(async () => { if (created) await fs.unlink(path.join(MANDATE_DOCUMENTS_DIR, String(created.storagePath))); });

    const result = await uploadMandateDocument({
        customerId: 1,
        mandateMollieId: 'mdt_1',
        file: { originalname: '../../evil name.pdf', buffer: PDF },
        caption: ' Paper mandate ',
    });

    assert.equal(created?.mandateId, 3);
    assert.equal(created?.mimeType, 'application/pdf');
    assert.equal(created?.caption, 'Paper mandate');
    assert.equal(created?.originalName, 'evil name.pdf');
    assert.match(String(created?.storagePath), /^[0-9a-f-]{36}\.pdf$/);
    assert.deepEqual(await fs.readFile(path.join(MANDATE_DOCUMENTS_DIR, String(created?.storagePath))), PDF);
    assert.equal(result.mandateId, 'mdt_1');
    assert.equal('storagePath' in result, false);
});

test('listCustomerMandateDocuments exposes the Mollie mandate id and hides the storage path', async (t) => {
    let where: unknown;
    stub(t, prisma.mandateDocument, 'findMany', async (args: { where: unknown }) => {
        where = args.where;
        return [storedRow];
    });

    const documents = await listCustomerMandateDocuments(5);

    assert.deepEqual(where, { mandate: { customerId: 5 } });
    assert.deepEqual(documents, [{
        id: 7,
        mandateId: 'mdt_1',
        originalName: 'mandaat.pdf',
        mimeType: 'application/pdf',
        sizeBytes: PDF.length,
        caption: 'Paper mandate from the mother',
        createdAt: storedRow.createdAt,
    }]);
});

test('getMandateDocumentFile resolves only inside the private mandate directory', async (t) => {
    stub(t, prisma.mandateDocument, 'findUnique', async () => ({ ...storedRow, storagePath: '../../etc/passwd' }));

    const file = await getMandateDocumentFile(7);

    assert.equal(file.filePath, path.join(MANDATE_DOCUMENTS_DIR, 'passwd'));
});

test('getMandateDocumentFile reports a missing document as 404', async (t) => {
    stub(t, prisma.mandateDocument, 'findUnique', async () => null);

    await assert.rejects(getMandateDocumentFile(99), (error: { status: number }) => error.status === 404);
});

test('deleteMandateDocument removes the row and its file', async (t) => {
    const storagePath = 'delete-me-test.pdf';
    await fs.mkdir(MANDATE_DOCUMENTS_DIR, { recursive: true });
    await fs.writeFile(path.join(MANDATE_DOCUMENTS_DIR, storagePath), PDF);
    stub(t, prisma.mandateDocument, 'findUnique', async () => ({ ...storedRow, storagePath }));
    stub(t, prisma.mandateDocument, 'delete', async () => storedRow);

    await deleteMandateDocument(7);

    await assert.rejects(fs.access(path.join(MANDATE_DOCUMENTS_DIR, storagePath)));
});

test('removeMandateDocumentFiles ignores files that are already gone', async () => {
    await assert.doesNotReject(removeMandateDocumentFiles(['never-existed.pdf']));
});

test('deleting a Mollie customer also removes its signed mandate files from disk', async (t) => {
    const storagePath = 'customer-delete-test.pdf';
    await fs.mkdir(MANDATE_DOCUMENTS_DIR, { recursive: true });
    await fs.writeFile(path.join(MANDATE_DOCUMENTS_DIR, storagePath), PDF);
    stub(t, prisma.customer, 'findUnique', async () => ({ id: 1, mollieId: null }));
    stub(t, prisma.mandate, 'count', async () => 0);
    stub(t, prisma.subscription, 'count', async () => 0);
    stub(t, prisma.mandateDocument, 'findMany', async () => [{ storagePath }]);
    stub(t, prisma, '$transaction', async () => [0, 0, 0, 0, 0, { id: 1 }]);
    t.mock.method(mollieService, 'deleteCustomerById', async () => true as never);
    const res: Response = fromPartial({
        statusCode: 200,
        status(code: number) { this.statusCode = code; return this; },
        json() { return this; },
    });

    await deleteCustomerController(fromPartial<Request>({ params: { customerId: '1' } }), res);

    assert.equal(res.statusCode, 200);
    await assert.rejects(fs.access(path.join(MANDATE_DOCUMENTS_DIR, storagePath)));
});
