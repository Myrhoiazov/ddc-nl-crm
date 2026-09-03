import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Invoice, InvoicesResponse, InvoiceStatus } from '../../model/types';
import { InvoiceAction, ActionResult } from '../InvoiceActionModal/InvoiceActionModal';

const errorMessage = (error: any, fallback: string) => error?.response?.data?.message ?? fallback;
const PAGE_SIZE = 15;

export const useInvoicesPage = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [paidMode, setPaidMode] = useState(false);
    const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
    const [status, setStatus] = useState('ALL');
    const [query, setQuery] = useState('');
    const [appliedQuery, setAppliedQuery] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewNumber, setPreviewNumber] = useState('');
    const [activeAction, setActiveAction] = useState<InvoiceAction | null>(null);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const response = await $apiPrivate.get<InvoicesResponse>('/invoices', {
                params: {
                    status,
                    _q: appliedQuery || undefined,
                    _page: page,
                    _limit: PAGE_SIZE,
                },
            });
            setInvoices(response.data.items);
            setTotal(response.data.total);
            setPage(response.data.page);
            setTotalPages(response.data.totalPages);
        } catch {
            toast.error('Не удалось загрузить инвойсы');
        } finally {
            setLoading(false);
        }
    }, [appliedQuery, page, status]);

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

    const updateStatus = async (invoice: Invoice, nextStatus: Extract<InvoiceStatus, 'ISSUED' | 'CANCELLED'>) => {
        try {
            await $apiPrivate.patch(`/invoices/${invoice.id}/status`, { status: nextStatus });
            toast.success(nextStatus === 'CANCELLED' ? 'Инвойс и активные платежи Mollie отменены' : 'Статус обновлён');
            fetchInvoices();
        } catch (error) {
            toast.error(errorMessage(error, 'Не удалось обновить статус'));
        }
    };

    const handleActionConfirm = async (result: ActionResult) => {
        if (!activeAction) return;
        const { invoice } = activeAction;
        setActiveAction(null);

        try {
            switch (result.type) {
                case 'record-payment':
                    await $apiPrivate.post(`/invoices/${invoice.id}/payments`, result.data);
                    toast.success('Оплата зарегистрирована');
                    break;
                case 'confirm-paid':
                    await $apiPrivate.post(`/invoices/${invoice.id}/confirm-paid`, result.data);
                    toast.success('Черновик подтверждён как оплаченный');
                    break;
                case 'create-credit':
                    await $apiPrivate.post(`/invoices/${invoice.id}/adjustments`, { kind: 'CREDIT', ...result.data });
                    toast.success('Кредит-нота создана');
                    break;
                case 'create-debit':
                    await $apiPrivate.post(`/invoices/${invoice.id}/adjustments`, { kind: 'DEBIT', ...result.data });
                    toast.success('Корректировка создана');
                    break;
                case 'cancel':
                    await $apiPrivate.patch(`/invoices/${invoice.id}/status`, { status: 'CANCELLED' });
                    toast.success('Инвойс и активные платежи Mollie отменены');
                    break;
            }
            fetchInvoices();
        } catch (error) {
            toast.error(errorMessage(error, 'Не удалось выполнить действие'));
        }
    };

    const createMolliePaymentLink = async (invoice: Invoice) => {
        try {
            const response = await $apiPrivate.post<{ checkoutUrl: string }>(`/invoices/${invoice.id}/mollie-payment-link`);
            window.open(response.data.checkoutUrl, '_blank', 'noopener,noreferrer');
            toast.success('Ссылка Mollie готова');
            fetchInvoices();
        } catch (error) {
            toast.error(errorMessage(error, 'Не удалось создать ссылку Mollie'));
        }
    };

    const loadPdf = async (invoice: Invoice) => {
        const response = await $apiPrivate.get(`/invoices/${invoice.id}/pdf`, { responseType: 'blob' });
        return URL.createObjectURL(response.data);
    };

    const previewPdf = async (invoice: Invoice) => {
        try {
            const url = await loadPdf(invoice);
            setPreviewUrl(url);
            setPreviewNumber(invoice.number);
        } catch {
            toast.error('Не удалось открыть PDF');
        }
    };

    const downloadPdf = async (invoice: Invoice) => {
        try {
            const url = await loadPdf(invoice);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${invoice.number}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Не удалось скачать PDF');
        }
    };

    const closePreview = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
        setPreviewNumber('');
    };

    const sendEmail = async (invoice: Invoice) => {
        const resend = invoice.deliveries.some((delivery) => delivery.status === 'SENT');
        try {
            await $apiPrivate.post(`/invoices/${invoice.id}/send`, { resend });
            toast.success(resend ? 'Инвойс отправлен повторно' : 'Инвойс отправлен');
            fetchInvoices();
        } catch (error) {
            toast.error(errorMessage(error, 'Не удалось отправить инвойс'));
            fetchInvoices();
        }
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditInvoice(null);
        setPaidMode(false);
    };

    const applySearch = () => {
        setPage(1);
        setAppliedQuery(query.trim());
    };

    const resetSearch = () => {
        setQuery('');
        setAppliedQuery('');
        setPage(1);
    };

    const openCreateModal = (nextPaidMode: boolean) => {
        setPaidMode(nextPaidMode);
        setModalOpen(true);
    };

    const openEditModal = (invoice: Invoice) => {
        setEditInvoice(invoice);
        setModalOpen(true);
    };

    return {
        invoices,
        loading,
        modalOpen,
        paidMode,
        editInvoice,
        status,
        setStatus,
        query,
        setQuery,
        appliedQuery,
        page,
        setPage,
        total,
        totalPages,
        previewUrl,
        previewNumber,
        activeAction,
        setActiveAction,
        fetchInvoices,
        updateStatus,
        handleActionConfirm,
        createMolliePaymentLink,
        previewPdf,
        downloadPdf,
        closePreview,
        sendEmail,
        closeModal,
        applySearch,
        resetSearch,
        openCreateModal,
        openEditModal,
    };
};
