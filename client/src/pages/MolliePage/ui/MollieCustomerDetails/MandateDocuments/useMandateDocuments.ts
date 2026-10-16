import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
    MandateDocument,
    MandateDocumentUpload,
    deleteMandateDocumentRequest,
    downloadMandateDocumentFile,
    fetchMandateDocuments,
    groupDocumentsByMandate,
    uploadMandateDocumentRequest,
} from './mandateDocumentsApi';

const getErrorMessage = (error: unknown, fallback: string) => {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    return message || fallback;
};

export const useMandateDocuments = (customerId: string, version: number) => {
    const [documents, setDocuments] = useState<MandateDocument[]>([]);
    const [busyMandateId, setBusyMandateId] = useState<string | null>(null);

    useEffect(() => {
        fetchMandateDocuments(customerId)
            .then(setDocuments)
            .catch(() => toast.error('Не удалось загрузить подписанные мандаты'));
    }, [customerId, version]);

    const documentsByMandate = useMemo(() => groupDocumentsByMandate(documents), [documents]);

    const onUpload = useCallback(async (upload: Omit<MandateDocumentUpload, 'customerId'>) => {
        setBusyMandateId(upload.mandateId);
        try {
            const created = await uploadMandateDocumentRequest({ ...upload, customerId });
            setDocuments((current) => [created, ...current]);
            toast.success('Подписанный мандат загружен');
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error, 'Не удалось загрузить файл мандата'));
            return false;
        } finally {
            setBusyMandateId(null);
        }
    }, [customerId]);

    const onDelete = useCallback(async (document: MandateDocument) => {
        if (!window.confirm(`Удалить файл «${document.originalName}»?`)) return;
        try {
            await deleteMandateDocumentRequest(document.id);
            setDocuments((current) => current.filter((item) => item.id !== document.id));
        } catch (error) {
            toast.error(getErrorMessage(error, 'Не удалось удалить файл мандата'));
        }
    }, []);

    const onDownload = useCallback(async (document: MandateDocument) => {
        try {
            await downloadMandateDocumentFile(document);
        } catch {
            toast.error('Не удалось скачать файл мандата');
        }
    }, []);

    return { documentsByMandate, busyMandateId, onUpload, onDelete, onDownload };
};
