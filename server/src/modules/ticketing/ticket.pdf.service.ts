import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { PublicTicketSeat, TicketBundle } from './ticket.types';

// PDF билетов собирается на лету из уже проверенного комплекта. В QR уходит только
// непрозрачный токен: никаких имён, адресов и номеров заказа внутри изображения.

const MARGIN = 55;
const CONTENT_WIDTH = 595 - MARGIN * 2;
const PAGE_BOTTOM = 700;
const TICKET_BLOCK_HEIGHT = 190;

const bundledFontDir = path.join(path.dirname(require.resolve('dejavu-fonts-ttf/package.json')), 'ttf');
const findFont = (candidates: string[], fallback: string) => candidates.find(fs.existsSync) ?? fallback;
const regularFont = findFont([
    path.join(bundledFontDir, 'DejaVuSans.ttf'),
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
], 'Helvetica');
const boldFont = findFont([
    path.join(bundledFontDir, 'DejaVuSans-Bold.ttf'),
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
], 'Helvetica-Bold');

const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(parsed);
};

const seatLabel = (seat: PublicTicketSeat) => [
    seat.sectionLabel, `Row ${seat.rowLabel}`, `Seat ${seat.seatLabel}`, seat.categoryName,
].filter(Boolean).join(' · ');

const renderHeader = (doc: PDFKit.PDFDocument, bundle: TicketBundle): number => {
    let y = MARGIN;
    doc.font(boldFont).fontSize(22).text('Admission tickets', MARGIN, y, { width: CONTENT_WIDTH });
    y += 32;
    doc.font(boldFont).fontSize(14).text(bundle.event.title, MARGIN, y, { width: CONTENT_WIDTH });
    y += 23;
    doc.font(regularFont).fontSize(10).text(`Order ${bundle.orderNumber}`, MARGIN, y, { width: CONTENT_WIDTH });
    y += 16;
    const venue = [bundle.event.venueName, bundle.event.venueCity].filter(Boolean).join(', ');
    doc.font(regularFont).fontSize(10).text(`${venue} · ${formatDate(bundle.event.startsAt)}`, MARGIN, y, { width: CONTENT_WIDTH });
    return y + 32;
};

const renderTicket = async (
    doc: PDFKit.PDFDocument,
    ticket: TicketBundle['tickets'][number],
    number: number,
    total: number,
    y: number,
) => {
    doc.font(boldFont).fontSize(12).text(`Ticket ${number} of ${total}`, MARGIN, y, { width: CONTENT_WIDTH });
    doc.font(regularFont).fontSize(10).text(seatLabel(ticket.seat), MARGIN, y + 19, { width: CONTENT_WIDTH });
    const qr = await QRCode.toDataURL(ticket.token, { errorCorrectionLevel: 'M', margin: 1, width: 240 });
    doc.image(qr, MARGIN, y + 40, { width: 120 });
    doc.font(regularFont).fontSize(9).text('Show this code at the entrance', MARGIN + 135, y + 45, { width: 250 });
};

export const createTicketPdf = async (bundle: TicketBundle): Promise<PDFKit.PDFDocument> => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
    let y = renderHeader(doc, bundle);
    for (let index = 0; index < bundle.tickets.length; index += 1) {
        const ticket = bundle.tickets[index];
        if (y + TICKET_BLOCK_HEIGHT > PAGE_BOTTOM) {
            doc.addPage();
            y = MARGIN;
        }
        await renderTicket(doc, ticket, index + 1, bundle.tickets.length, y);
        y += TICKET_BLOCK_HEIGHT;
    }
    return doc;
};

// Тот же PDF в виде буфера — для вложения в письмо.
export const ticketPdfBuffer = async (bundle: TicketBundle): Promise<Buffer> => {
    const document = await createTicketPdf(bundle);
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        document.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        document.on('end', () => resolve(Buffer.concat(chunks)));
        document.on('error', reject);
        document.end();
    });
};
