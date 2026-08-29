import { memo, useCallback, useEffect, useState } from 'react';
import { Page } from '@/widgets/Page/Page';
import { $apiPrivate } from '@/shared/api/api';
import { toast } from 'react-toastify';
import { CreateInvoiceModal } from '../CreateInvoiceModal/CreateInvoiceModal';
import { InvoiceActionModal, InvoiceAction, ActionResult } from '../InvoiceActionModal/InvoiceActionModal';
import { Invoice, InvoiceAuditLog, InvoicesResponse, InvoiceStatus } from '../../model/types';
import { Modal } from '@/shared/ui/Modal/Modal';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';
import { StateView } from '@/shared/ui/StateView';
import s from './InvoicesPage.module.scss';

const statusLabel: Record<InvoiceStatus, string> = {
    DRAFT: 'Черновик',
    ISSUED: 'Выдан',
    PARTIALLY_PAID: 'Частично оплачен',
    PAID: 'Оплачен',
    OVERDUE: 'Просрочен',
    CANCELLED: 'Отменён',
};

const documentLabel = {
    INVOICE: 'Инвойс',
    CREDIT_NOTE: 'Кредит-нота',
    DEBIT_NOTE: 'Корректировка',
};

const actionLabel: Record<string, string> = {
    CREATED: 'Документ создан',
    CREATED_PAID: 'Создан оплаченный инвойс',
    DRAFT_CONFIRMED_PAID: 'Черновик подтверждён как оплаченный',
    UPDATED: 'Документ изменён',
    STATUS_CHANGED: 'Статус изменён',
    CANCELLED: 'Документ отменён',
    PAYMENT_RECORDED: 'Оплата зарегистрирована',
    CREDIT_NOTE_APPLIED: 'Применена кредит-нота',
    DEBIT_NOTE_CREATED: 'Создана дебетовая корректировка',
    MARKED_OVERDUE: 'Отмечен как просроченный',
    MOLLIE_PAYMENT_LINK_CREATED: 'Создана ссылка Mollie',
    MOLLIE_RECONCILED: 'Оплата синхронизирована с Mollie',
    CANCELLATION_ROLLED_BACK: 'Отмена инвойса откачена',
};

const money = (cents: number) => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
}).format(cents / 100);

const actorName = (log: InvoiceAuditLog) => (
    [log.actor?.firstName, log.actor?.lastName].filter(Boolean).join(' ') || log.actor?.email || 'Система'
);

const errorMessage = (error: any, fallback: string) => error?.response?.data?.message ?? fallback;
const PAGE_SIZE = 15;

const InvoicesPage = memo(() => {
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
            if (result.type === 'record-payment') {
                await $apiPrivate.post(`/invoices/${invoice.id}/payments`, result.data);
                toast.success('Оплата зарегистрирована');
            } else if (result.type === 'confirm-paid') {
                await $apiPrivate.post(`/invoices/${invoice.id}/confirm-paid`, result.data);
                toast.success('Черновик подтверждён как оплаченный');
            } else if (result.type === 'create-credit') {
                await $apiPrivate.post(`/invoices/${invoice.id}/adjustments`, { kind: 'CREDIT', ...result.data });
                toast.success('Кредит-нота создана');
            } else if (result.type === 'create-debit') {
                await $apiPrivate.post(`/invoices/${invoice.id}/adjustments`, { kind: 'DEBIT', ...result.data });
                toast.success('Корректировка создана');
            } else if (result.type === 'cancel') {
                await $apiPrivate.patch(`/invoices/${invoice.id}/status`, { status: 'CANCELLED' });
                toast.success('Инвойс и активные платежи Mollie отменены');
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

    const canEdit = (invoice: Invoice) => (
        invoice.documentType === 'INVOICE'
        && !['PAID', 'CANCELLED'].includes(invoice.status)
        && invoice.paidAmountCents === 0
        && invoice.creditedAmountCents === 0
    );
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
            <span>{firstItemNumber}–{lastItemNumber} из {total}</span>
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
                    <h1>Инвойсы</h1>
                    <p>Надёжный учёт оплат, задолженности и корректировок</p>
                </div>
                <div className={s.headerActions}>
                    <button className={s.paidCreate} onClick={() => { setPaidMode(true); setModalOpen(true); }}>
                        + Черновик оплаченного
                    </button>
                    <button className={s.create} onClick={() => { setPaidMode(false); setModalOpen(true); }}>
                        + Создать инвойс
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
                <button onClick={applySearch}>Найти</button>
                {(query || appliedQuery) && <button onClick={resetSearch}>Сбросить</button>}
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
                            <article className={s.card} key={invoice.id}>
                                <div className={s.main}>
                                    <div className={s.number}>
                                        {invoice.number}
                                        <small>{documentLabel[invoice.documentType]}</small>
                                    </div>
                                    <div className={s.client}>{invoice.billToName}</div>
                                    <div className={s.meta}>
                                        {new Date(invoice.issueDate).toLocaleDateString('ru-RU')} · {invoice.items.length} строк
                                    </div>
                                </div>

                                <span className={`${s.status} ${s[invoice.status.toLowerCase()]}`}>
                                    {statusLabel[invoice.status]}
                                </span>

                                <div className={s.amounts}>
                                    <strong>{money(invoice.totalCents)}</strong>
                                    {invoice.documentType !== 'CREDIT_NOTE' && (
                                        <span>
                                            Оплачено {money(invoice.paidAmountCents)}
                                            {invoice.creditedAmountCents > 0 && ` · Зачтено ${money(invoice.creditedAmountCents)}`}
                                            {' · '}Долг {money(invoice.balanceDueCents)}
                                        </span>
                                    )}
                                    {invoice.paymentReference && (
                                        <span>Ref: {invoice.paymentReference}</span>
                                    )}
                                </div>

                                <div className={s.actions}>
                                    {canEdit(invoice) && (
                                        <button onClick={() => { setEditInvoice(invoice); setModalOpen(true); }}>
                                            Редактировать
                                        </button>
                                    )}
                                    <button onClick={() => previewPdf(invoice)}>Предпросмотр</button>
                                    <button onClick={() => downloadPdf(invoice)}>PDF</button>

                                    {invoice.billToEmail && !['DRAFT', 'CANCELLED'].includes(invoice.status) && (
                                        <button onClick={() => sendEmail(invoice)}>
                                            {invoice.deliveries.some((d) => d.status === 'SENT') ? 'Отправить снова' : 'Email'}
                                        </button>
                                    )}

                                    {invoice.documentType !== 'CREDIT_NOTE' && invoice.balanceDueCents > 0 && !['DRAFT', 'CANCELLED'].includes(invoice.status) && (
                                        <>
                                            <button onClick={() => createMolliePaymentLink(invoice)}>
                                                {invoice.molliePaymentLinks.some((l) => !l.archived && !l.paidAt)
                                                    ? 'Оплатить Mollie'
                                                    : 'Mollie link'}
                                            </button>
                                            <button onClick={() => setActiveAction({ type: 'record-payment', invoice })}>
                                                Добавить оплату
                                            </button>
                                        </>
                                    )}

                                    {invoice.documentType === 'INVOICE' && !['DRAFT', 'CANCELLED'].includes(invoice.status) && (
                                        <>
                                            <button onClick={() => setActiveAction({ type: 'create-credit', invoice })}>
                                                Кредит-нота
                                            </button>
                                            <button onClick={() => setActiveAction({ type: 'create-debit', invoice })}>
                                                Корректировка
                                            </button>
                                        </>
                                    )}

                                    {canEdit(invoice) && invoice.status === 'DRAFT' && (
                                        <button onClick={() => updateStatus(invoice, 'ISSUED')}>Выдать</button>
                                    )}
                                    {canEdit(invoice) && invoice.status === 'DRAFT' && (
                                        <button
                                            className={s.confirmPaid}
                                            onClick={() => setActiveAction({ type: 'confirm-paid', invoice })}
                                        >
                                            Подтвердить как оплаченный
                                        </button>
                                    )}
                                    {canEdit(invoice) && (
                                        <button
                                            className={s.cancel}
                                            onClick={() => setActiveAction({ type: 'cancel', invoice })}
                                        >
                                            Отменить
                                        </button>
                                    )}
                                </div>

                                {invoice.molliePayments.length > 0 && (
                                    <div className={s.mollie}>
                                        <strong>Mollie:</strong>
                                        {invoice.molliePayments.map((payment) => (
                                            <span key={payment.id}>
                                                {payment.mollieId ?? `#${payment.id}`} · {payment.status}
                                                {Number(payment.refundedAmount) > 0 && ` · refund €${Number(payment.refundedAmount).toFixed(2)}`}
                                                {Number(payment.chargedBackAmount) > 0 && ` · chargeback €${Number(payment.chargedBackAmount).toFixed(2)}`}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {invoice.molliePaymentLinks.length > 0 && (
                                    <div className={s.mollie}>
                                        <strong>Mollie links:</strong>
                                        {invoice.molliePaymentLinks.map((link) => (
                                            <span key={link.id}>
                                                {link.mollieId} · {link.archived ? 'archived' : 'active'}
                                                {link.expiresAt && ` · до ${new Date(link.expiresAt).toLocaleString('ru-RU')}`}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {invoice.payments.length > 0 && (
                                    <div className={s.mollie}>
                                        <strong>Оплаты:</strong>
                                        {invoice.payments.map((payment) => (
                                            <span key={payment.id}>
                                                {money(payment.amountCents)} · {payment.method} · {new Date(payment.paidAt).toLocaleDateString('ru-RU')}
                                                {payment.reference && ` · ${payment.reference}`}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {invoice.deliveries.length > 0 && (
                                    <details className={s.history}>
                                        <summary>Отправки ({invoice.deliveries.length})</summary>
                                        {invoice.deliveries.map((delivery) => (
                                            <div key={delivery.id}>
                                                <span>
                                                    {delivery.type} · {delivery.status}
                                                    {delivery.viewCount > 0 && ` · просмотрен ${delivery.viewCount} раз`}
                                                </span>
                                                <small>
                                                    {delivery.recipientEmail} · {new Date(delivery.createdAt).toLocaleString('ru-RU')}
                                                    {delivery.errorMessage && ` · ${delivery.errorMessage}`}
                                                </small>
                                            </div>
                                        ))}
                                    </details>
                                )}

                                <details className={s.history}>
                                    <summary>История ({invoice.auditLogs.length})</summary>
                                    {invoice.auditLogs.map((log) => (
                                        <div key={log.id}>
                                            <span>{actionLabel[log.action] ?? log.action}</span>
                                            <small>{actorName(log)} · {new Date(log.createdAt).toLocaleString('ru-RU')}</small>
                                        </div>
                                    ))}
                                </details>
                            </article>
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
                        <button onClick={closePreview}>Закрыть</button>
                    </div>
                    {previewUrl && <iframe title={`PDF ${previewNumber}`} src={previewUrl} />}
                </div>
            </Modal>
        </Page>
    );
});

export default InvoicesPage;
