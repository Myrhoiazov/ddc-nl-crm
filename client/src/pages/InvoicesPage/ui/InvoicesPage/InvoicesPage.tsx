import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { $apiPrivate } from '@/shared/api/api';
import { toast } from 'react-toastify';
import { CreateInvoiceModal } from '../CreateInvoiceModal/CreateInvoiceModal';
import { InvoiceActionModal, InvoiceAction, ActionResult } from '../InvoiceActionModal/InvoiceActionModal';
import { Invoice, InvoicesResponse, InvoiceStatus } from '../../model/types';
import { Modal } from '@/shared/ui/Modal/Modal';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';
import { StateView } from '@/shared/ui/StateView';
import { InvoiceListItem } from './InvoiceListItem';
import s from './InvoicesPage.module.scss';

const statusLabel: Record<InvoiceStatus, string> = {
    DRAFT: 'Черновик',
    ISSUED: 'Выдан',
    PARTIALLY_PAID: 'Частично оплачен',
    PAID: 'Оплачен',
    OVERDUE: 'Просрочен',
    CANCELLED: 'Отменён',
};

const errorMessage = (error: any, fallback: string) => error?.response?.data?.message ?? fallback;
const PAGE_SIZE = 15;

const InvoicesPage = memo(() => {
    const { t } = useTranslation();
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

    const firstItemNumber = total ? (page - 1) * PAGE_SIZE + 1 : 0;
    const lastItemNumber = Math.min(page * PAGE_SIZE, total);
    const applySearch = () => {
        setPage(1);
        setAppliedQuery(query.trim());
    };
    const resetSearch = () => {
        setQuery('');
        setAppliedQuery('');
        setPage(1);
    };
    const pagination = total > 0 ? (
        <div className={s.pagination}>
            <span>{firstItemNumber}–{lastItemNumber}{t(' из ')}{total}</span>
            <div className={s.paginationActions}>
                <button
                    className={s.pageButton}
                    disabled={loading || page <= 1}
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                    aria-label="Предыдущая страница"
                >←</button>
                <span>{page} / {totalPages}</span>
                <button
                    className={s.pageButton}
                    disabled={loading || page >= totalPages}
                    onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                    aria-label="Следующая страница"
                >→</button>
            </div>
        </div>
    ) : null;

    return (
        <Page>
            <div className={s.header}>
                <div>
                    <h1>{t('Инвойсы')}</h1>
                    <p>{t('Надёжный учёт оплат, задолженности и корректировок')}</p>
                </div>
                <div className={s.headerActions}>
                    <button className={s.paidCreate} onClick={() => { setPaidMode(true); setModalOpen(true); }}>
                        {t('+ Черновик оплаченного')}
                    </button>
                    <button className={s.create} onClick={() => { setPaidMode(false); setModalOpen(true); }}>
                        {t('+ Создать инвойс')}
                    </button>
                </div>
            </div>

            <div className={s.search}>
                <input
                    value={query}
                    placeholder="Имя, email, номер инвойса или транзакции"
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') applySearch(); }}
                    aria-label="Поиск инвойсов"
                />
                <button onClick={applySearch}>{t('Найти')}</button>
                {(query || appliedQuery) && <button onClick={resetSearch}>{t('Сбросить')}</button>}
            </div>

            <div className={s.filters} role="group" aria-label="Фильтр по статусу">
                {(['ALL', 'ISSUED', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'DRAFT', 'CANCELLED'] as const).map((value) => (
                    <button
                        key={value}
                        className={status === value ? s.active : ''}
                        onClick={() => { setPage(1); setStatus(value); }}
                        aria-pressed={status === value}
                    >
                        {value === 'ALL' ? 'Все' : statusLabel[value]}
                    </button>
                ))}
            </div>

            {loading ? (
                <ListSkeleton rows={4} height={104} />
            ) : invoices.length === 0 ? (
                <StateView
                    className={s.empty}
                    title={appliedQuery ? 'По вашему запросу ничего не найдено' : 'Инвойсов пока нет'}
                    text={appliedQuery
                        ? 'Попробуйте изменить имя, email, номер или транзакцию.'
                        : 'Создайте первый черновик, проверьте данные и затем выставьте инвойс.'}
                />
            ) : (
                <>
                    {pagination}
                    <div className={s.list}>
                        {invoices.map((invoice) => (
                            <InvoiceListItem
                                key={invoice.id}
                                invoice={invoice}
                                statusLabel={statusLabel}
                                onEdit={(target) => { setEditInvoice(target); setModalOpen(true); }}
                                onPreviewPdf={previewPdf}
                                onDownloadPdf={downloadPdf}
                                onSendEmail={sendEmail}
                                onCreateMolliePaymentLink={createMolliePaymentLink}
                                onSetActiveAction={setActiveAction}
                                onUpdateStatus={updateStatus}
                            />
                        ))}
                    </div>
                    {pagination}
                </>
            )}

            <CreateInvoiceModal
                isOpen={modalOpen}
                onClose={closeModal}
                onSaved={fetchInvoices}
                editInvoice={editInvoice}
                paidMode={paidMode}
            />

            <InvoiceActionModal
                action={activeAction}
                onConfirm={handleActionConfirm}
                onClose={() => setActiveAction(null)}
            />

            <Modal isOpen={Boolean(previewUrl)} onClose={closePreview} lazy>
                <div className={s.previewModal}>
                    <div>
                        <strong>{previewNumber}</strong>
                        <button onClick={closePreview}>{t('Закрыть')}</button>
                    </div>
                    {previewUrl && <iframe title={`PDF ${previewNumber}`} src={previewUrl} />}
                </div>
            </Modal>
        </Page>
    );
});

export default InvoicesPage;
