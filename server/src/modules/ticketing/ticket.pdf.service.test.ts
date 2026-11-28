import assert from 'node:assert/strict';
import { test } from 'node:test';
import QRCode from 'qrcode';
import { createTicketPdf } from './ticket.pdf.service';
import type { TicketBundle } from './ticket.types';

const bundle: TicketBundle = {
    orderNumber: 'DDC-2027-0001',
    event: {
        title: 'Spring Gala',
        startsAt: '2027-03-01T20:00:00.000Z',
        doorsAt: null,
        venueName: 'Club Amsterdam',
        venueAddress: 'Damrak 1',
        venueCity: 'Amsterdam',
        seatMapName: 'Main hall',
    },
    tickets: [{
        token: 'v1.AbcDef123',
        status: 'VALID',
        issuedAt: new Date('2027-02-01T10:00:00.000Z'),
        seat: { sectionLabel: '', rowLabel: '1', seatLabel: '2', categoryName: 'Standard', priceCents: 2500 },
    }],
};

const collectPdf = async (document: PDFKit.PDFDocument) => {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
        document.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        document.on('end', () => resolve());
        document.on('error', reject);
        document.end();
    });
    return Buffer.concat(chunks);
};

test('a ticket PDF renders a QR containing only the opaque ticket token', async (t) => {
    const png = await QRCode.toDataURL('fixture');
    const encoded: string[] = [];
    t.mock.method(QRCode, 'toDataURL', async (text: string) => {
        encoded.push(text);
        return png;
    });

    const pdf = await collectPdf(await createTicketPdf(bundle));

    assert.deepEqual(encoded, [bundle.tickets[0].token]);
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.equal(pdf.includes(Buffer.from('anna@example.com')), false);
});
