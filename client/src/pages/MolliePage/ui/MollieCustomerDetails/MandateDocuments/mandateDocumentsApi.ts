import { $apiPrivate } from '@/shared/api/api';

export interface MandateDocument {
    id: number;
    mandateId: string | null;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    caption: string | null;
    createdAt: string;
}

export interface MandateDocumentUpload {
    customerId: string;
    mandateId: string;
    file: File;
    caption: string;
}

export const MANDATE_DOCUMENT_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

export const fetchMandateDocuments = async (customerId: string) => {
    const response = await $apiPrivate.get<MandateDocument[]>(`/mollie/customers/${customerId}/mandate-documents`);
    return response.data ?? [];
};

export const uploadMandateDocumentRequest = async ({ customerId, mandateId, file, caption }: MandateDocumentUpload) => {
    const payload = new FormData();
    payload.append('file', file);
    if (caption.trim()) payload.append('caption', caption.trim());
    const response = await $apiPrivate.post<MandateDocument>(
        `/mollie/customers/${customerId}/mandates/${mandateId}/documents`,
        payload,
    );
    return response.data;
};

export const deleteMandateDocumentRequest = (documentId: number) =>
    $apiPrivate.delete(`/mollie/mandate-documents/${documentId}`);

export const downloadMandateDocumentFile = async (document: MandateDocument) => {
    const response = await $apiPrivate.get(`/mollie/mandate-documents/${document.id}/download`, {
        responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = document.originalName;
    link.click();
    URL.revokeObjectURL(url);
};

export const groupDocumentsByMandate = (documents: MandateDocument[]) =>
    documents.reduce<Record<string, MandateDocument[]>>((groups, document) => {
        if (!document.mandateId) return groups;
        (groups[document.mandateId] ??= []).push(document);
        return groups;
    }, {});

export const formatDocumentSize = (sizeBytes: number) => (
    sizeBytes >= 1024 * 1024
        ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`
        : `${Math.max(1, Math.round(sizeBytes / 1024))} КБ`
);
