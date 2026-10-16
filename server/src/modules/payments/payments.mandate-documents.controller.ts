import { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import ApiError from '../../common/errors/api-error';
import {
    MANDATE_DOCUMENT_MAX_BYTES,
    deleteMandateDocument,
    getMandateDocumentFile,
    listCustomerMandateDocuments,
    uploadMandateDocument,
} from './payments.mandate-documents.service';

// Memory storage: the file type is decided from the bytes before anything touches the disk.
const mandateDocumentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MANDATE_DOCUMENT_MAX_BYTES, files: 1 },
});

export const uploadMandateDocumentFile = (req: Request, res: Response, next: NextFunction) => {
    mandateDocumentUpload.single('file')(req, res, (error) => {
        if (!error) return next();
        if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'Файл мандата должен быть меньше 10 МБ' });
        }
        return res.status(400).json({ message: error.message || 'Не удалось загрузить файл мандата' });
    });
};

const parsePositiveId = (raw: string, label: string) => {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) throw ApiError.BadRequest(`Некорректный ${label}`);
    return id;
};

export const mollieGetCustomerMandateDocumentsController = async (req: Request, res: Response) => {
    const customerId = parsePositiveId(req.params.customerId, 'id клиента');
    return res.status(200).json(await listCustomerMandateDocuments(customerId));
};

export const mollieUploadMandateDocumentController = async (req: Request, res: Response) => {
    const customerId = parsePositiveId(req.params.customerId, 'id клиента');
    if (!req.file) throw ApiError.BadRequest('Файл мандата не загружен');

    const document = await uploadMandateDocument({
        customerId,
        mandateMollieId: req.params.mandateId,
        file: req.file,
        caption: req.body?.caption,
    });
    return res.status(201).json(document);
};

export const mollieDownloadMandateDocumentController = async (req: Request, res: Response) => {
    const file = await getMandateDocumentFile(parsePositiveId(req.params.documentId, 'id документа'));
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    return res.sendFile(file.filePath, (error) => {
        if (error && !res.headersSent) res.status(404).json({ message: 'Файл мандата отсутствует на сервере' });
    });
};

export const mollieDeleteMandateDocumentController = async (req: Request, res: Response) => {
    await deleteMandateDocument(parsePositiveId(req.params.documentId, 'id документа'));
    return res.status(204).send();
};
