import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../../prisma/prisma-client';
import ApiError from '../../common/errors/api-error';
import { ROOT_DIR } from '../../common/utils/paths';

// Signed mandates carry IBANs and signatures — like email attachments they live outside
// `public/` so the only way to read one back is the authenticated download route.
export const MANDATE_DOCUMENTS_DIR = path.resolve(ROOT_DIR, 'private-uploads/mandate-documents');
export const MANDATE_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const MANDATE_DOCUMENT_CAPTION_MAX_LENGTH = 500;

type MandateDocumentMimeType = 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp';

const EXTENSION_BY_MIME_TYPE: Record<MandateDocumentMimeType, string> = {
    'application/pdf': '.pdf',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
};

const startsWithBytes = (buffer: Buffer, bytes: number[], offset = 0) =>
    buffer.length >= offset + bytes.length && bytes.every((byte, index) => buffer[offset + index] === byte);

const asciiBytes = (text: string) => Array.from(Buffer.from(text, 'ascii'));

const MIME_SIGNATURES: Array<{ mimeType: MandateDocumentMimeType; matches: (buffer: Buffer) => boolean }> = [
    { mimeType: 'application/pdf', matches: (buffer) => startsWithBytes(buffer, asciiBytes('%PDF-')) },
    { mimeType: 'image/png', matches: (buffer) => startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
    { mimeType: 'image/jpeg', matches: (buffer) => startsWithBytes(buffer, [0xff, 0xd8, 0xff]) },
    {
        mimeType: 'image/webp',
        matches: (buffer) => startsWithBytes(buffer, asciiBytes('RIFF')) && startsWithBytes(buffer, asciiBytes('WEBP'), 8),
    },
];

// The browser-supplied mimetype is attacker-controlled; the stored type (and therefore the
// Content-Type the file is served with) always comes from the file's own signature.
export const detectMandateDocumentMimeType = (buffer: Buffer): MandateDocumentMimeType | null =>
    MIME_SIGNATURES.find((signature) => signature.matches(buffer))?.mimeType ?? null;

export const normalizeMandateDocumentCaption = (raw: unknown): string | null => {
    const caption = typeof raw === 'string' ? raw.trim() : '';
    if (caption.length > MANDATE_DOCUMENT_CAPTION_MAX_LENGTH) {
        throw ApiError.BadRequest(`Подпись не должна быть длиннее ${MANDATE_DOCUMENT_CAPTION_MAX_LENGTH} символов`);
    }
    return caption || null;
};

const notFound = (message: string) => new ApiError(404, message);

const documentSelect = {
    id: true,
    originalName: true,
    mimeType: true,
    sizeBytes: true,
    storagePath: true,
    caption: true,
    createdAt: true,
    mandate: { select: { mollieId: true } },
} as const;

type StoredMandateDocument = {
    id: number;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    caption: string | null;
    createdAt: Date;
    mandate: { mollieId: string | null };
};

// The client only knows mandates by their Mollie id (see toMandateResponse) and never needs
// to see where the file sits on disk.
const toMandateDocumentResponse = (document: StoredMandateDocument) => ({
    id: document.id,
    mandateId: document.mandate.mollieId,
    originalName: document.originalName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    caption: document.caption,
    createdAt: document.createdAt,
});

const resolveStoredFilePath = (storagePath: string) => path.join(MANDATE_DOCUMENTS_DIR, path.basename(storagePath));

const findCustomerMandateId = async (customerId: number, mandateMollieId: string) => {
    const mandate = await prisma.mandate.findFirst({
        where: { customerId, mollieId: mandateMollieId },
        select: { id: true },
    });
    if (!mandate) throw notFound('Мандат не найден у этого клиента');
    return mandate.id;
};

const writeMandateDocumentFile = async (buffer: Buffer, mimeType: MandateDocumentMimeType) => {
    await fs.mkdir(MANDATE_DOCUMENTS_DIR, { recursive: true });
    const storagePath = `${uuidv4()}${EXTENSION_BY_MIME_TYPE[mimeType]}`;
    await fs.writeFile(resolveStoredFilePath(storagePath), buffer);
    return storagePath;
};

export interface UploadMandateDocumentParams {
    customerId: number;
    mandateMollieId: string;
    file: { originalname: string; buffer: Buffer };
    caption?: unknown;
}

export const uploadMandateDocument = async ({ customerId, mandateMollieId, file, caption }: UploadMandateDocumentParams) => {
    const normalizedCaption = normalizeMandateDocumentCaption(caption);
    const mandateId = await findCustomerMandateId(customerId, mandateMollieId);
    const mimeType = detectMandateDocumentMimeType(file.buffer);
    if (!mimeType) throw ApiError.BadRequest('Поддерживаются только PDF, JPG, PNG и WebP');

    const storagePath = await writeMandateDocumentFile(file.buffer, mimeType);
    try {
        const document = await prisma.mandateDocument.create({
            data: {
                mandateId,
                originalName: path.basename(file.originalname),
                mimeType,
                sizeBytes: file.buffer.length,
                storagePath,
                caption: normalizedCaption,
            },
            select: documentSelect,
        });
        return toMandateDocumentResponse(document);
    } catch (error) {
        await removeMandateDocumentFiles([storagePath]);
        throw error;
    }
};

export const listCustomerMandateDocuments = async (customerId: number) => {
    const documents = await prisma.mandateDocument.findMany({
        where: { mandate: { customerId } },
        select: documentSelect,
        orderBy: { createdAt: 'desc' },
    });
    return documents.map(toMandateDocumentResponse);
};

const findMandateDocument = async (documentId: number) => {
    const document = await prisma.mandateDocument.findUnique({ where: { id: documentId }, select: documentSelect });
    if (!document) throw notFound('Документ мандата не найден');
    return document;
};

export const getMandateDocumentFile = async (documentId: number) => {
    const document = await findMandateDocument(documentId);
    return {
        filePath: resolveStoredFilePath(document.storagePath),
        mimeType: document.mimeType,
        originalName: document.originalName,
    };
};

export const removeMandateDocumentFiles = async (storagePaths: string[]) => {
    await Promise.all(storagePaths.map((storagePath) => fs.rm(resolveStoredFilePath(storagePath), { force: true })));
};

export const deleteMandateDocument = async (documentId: number) => {
    const document = await findMandateDocument(documentId);
    await prisma.mandateDocument.delete({ where: { id: documentId } });
    await removeMandateDocumentFiles([document.storagePath]);
};

// Deleting a customer cascades its mandates and their document rows in the database; this
// returns the files to clean up from disk once that transaction has committed.
export const listCustomerMandateDocumentPaths = async (customerId: number) => {
    const documents = await prisma.mandateDocument.findMany({
        where: { mandate: { customerId } },
        select: { storagePath: true },
    });
    return documents.map((document) => document.storagePath);
};
