import { FormEvent, memo, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Invoice } from '../../model/types';
import s from './InvoiceActionModal.module.scss';

const money = (cents: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);

const today = () => new Date().toISOString().slice(0, 10);

type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'OTHER';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
    { value: 'BANK_TRANSFER', label: 'Банковский перевод' },
    { value: 'CASH', label: 'Наличные' },
    { value: 'CARD', label: 'Карта' },
    { value: 'OTHER', label: 'Другой' },
];

// --- Action types ---

export type InvoiceAction =
    | { type: 'record-payment'; invoice: Invoice }
    | { type: 'confirm-paid'; invoice: Invoice }
    | { type: 'create-credit'; invoice: Invoice }
    | { type: 'create-debit'; invoice: Invoice }
    | { type: 'cancel'; invoice: Invoice };

export interface RecordPaymentResult {
    amountCents: number;
    method: PaymentMethod;
    paidAt: string;
    reference: string;
}

export interface ConfirmPaidResult {
    paidAt: string;
    method: PaymentMethod;
    reference: string;
}

export interface AdjustmentResult {
    amountCents: number;
    reason: string;
}

export type ActionResult =
    | { type: 'record-payment'; data: RecordPaymentResult }
    | { type: 'confirm-paid'; data: ConfirmPaidResult }
    | { type: 'create-credit'; data: AdjustmentResult }
    | { type: 'create-debit'; data: AdjustmentResult }
    | { type: 'cancel' };

interface Props {
    action: InvoiceAction | null;
    onConfirm: (result: ActionResult) => void;
    onClose: () => void;
}

// --- Sub-forms ---

const RecordPaymentForm = memo(({ invoice, onSubmit, onCancel }: {
    invoice: Invoice;
    onSubmit: (data: RecordPaymentResult) => void;
    onCancel: () => void;
}) => {
    const { t } = useTranslation();
    const id = useId();
    const defaultAmount = (invoice.balanceDueCents / 100).toFixed(2);
    const [amount, setAmount] = useState(defaultAmount);
    const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
    const [paidAt, setPaidAt] = useState(today());
    const [reference, setReference] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const amountCents = Math.round(Number(amount.replace(',', '.')) * 100);
        if (!Number.isFinite(amountCents) || amountCents <= 0) return;
        onSubmit({ amountCents, method, paidAt, reference });
    };

    return (
        <form className={s.form} onSubmit={handleSubmit}>
            <div className={s.row}>
                <div className={s.field}>
                    <label htmlFor={`${id}-amount`}>{t('Сумма, EUR')}</label>
                    <input
                        id={`${id}-amount`}
                        type="number"
                        min="0.01"
                        max={(invoice.balanceDueCents / 100).toFixed(2)}
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                <div className={s.field}>
                    <label htmlFor={`${id}-date`}>{t('Дата оплаты')}</label>
                    <input
                        id={`${id}-date`}
                        type="date"
                        value={paidAt}
                        onChange={(e) => setPaidAt(e.target.value)}
                        required
                    />
                </div>
            </div>
            <div className={s.row}>
                <div className={s.field}>
                    <label htmlFor={`${id}-method`}>{t('Метод')}</label>
                    <select id={`${id}-method`} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                        {PAYMENT_METHODS.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>
                <div className={s.field}>
                    <label htmlFor={`${id}-ref`}>{t('Reference (необязательно)')}</label>
                    <input
                        id={`${id}-ref`}
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="№ транзакции"
                    />
                </div>
            </div>
            <div className={s.footer}>
                <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={onCancel}>{t('Отмена')}</button>
                <button type="submit" className={`${s.btn} ${s.btnPrimary}`}>{t('Зарегистрировать')}</button>
            </div>
        </form>
    );
});

const ConfirmPaidForm = memo(({ invoice, onSubmit, onCancel }: {
    invoice: Invoice;
    onSubmit: (data: ConfirmPaidResult) => void;
    onCancel: () => void;
}) => {
    const { t } = useTranslation();
    const id = useId();
    const [paidAt, setPaidAt] = useState(today());
    const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
    const [reference, setReference] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit({ paidAt, method, reference });
    };

    return (
        <form className={s.form} onSubmit={handleSubmit}>
            <div className={s.warning}>
                <span>{t('⚠️')}</span>
                <span>{t('После подтверждения инвойс на {{amount}} будет заблокирован для редактирования.', { amount: money(invoice.totalCents) })}</span>
            </div>
            <div className={s.row}>
                <div className={s.field}>
                    <label htmlFor={`${id}-date`}>{t('Дата оплаты')}</label>
                    <input
                        id={`${id}-date`}
                        type="date"
                        value={paidAt}
                        onChange={(e) => setPaidAt(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                <div className={s.field}>
                    <label htmlFor={`${id}-method`}>{t('Метод')}</label>
                    <select id={`${id}-method`} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                        {PAYMENT_METHODS.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className={s.field}>
                <label htmlFor={`${id}-ref`}>{t('Reference (необязательно)')}</label>
                <input
                    id={`${id}-ref`}
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="№ транзакции"
                />
            </div>
            <div className={s.footer}>
                <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={onCancel}>{t('Отмена')}</button>
                <button type="submit" className={`${s.btn} ${s.btnPrimary}`}>{t('Подтвердить оплату')}</button>
            </div>
        </form>
    );
});

const AdjustmentForm = memo(({ kind, invoice, onSubmit, onCancel }: {
    kind: 'CREDIT' | 'DEBIT';
    invoice: Invoice;
    onSubmit: (data: AdjustmentResult) => void;
    onCancel: () => void;
}) => {
    const { t } = useTranslation();
    const id = useId();
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const isCredit = kind === 'CREDIT';
    const maxCents = isCredit
        ? invoice.totalCents - invoice.creditedAmountCents
        : undefined;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const amountCents = Math.round(Number(amount.replace(',', '.')) * 100);
        if (!Number.isFinite(amountCents) || amountCents <= 0 || !reason.trim()) return;
        onSubmit({ amountCents, reason: reason.trim() });
    };

    return (
        <form className={s.form} onSubmit={handleSubmit}>
            {isCredit && maxCents !== undefined && (
                <div className={s.warning}>
                    <span>{t('ℹ️')}</span>
                    <span>{t('Максимальная сумма кредит-ноты: {{amount}}', { amount: money(maxCents) })}</span>
                </div>
            )}
            <div className={s.field}>
                <label htmlFor={`${id}-amount`}>{t('Сумма, EUR')}</label>
                <input
                    id={`${id}-amount`}
                    type="number"
                    min="0.01"
                    max={maxCents !== undefined ? (maxCents / 100).toFixed(2) : undefined}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    autoFocus
                    placeholder="0.00"
                />
            </div>
            <div className={s.field}>
                <label htmlFor={`${id}-reason`}>{t('Причина')}</label>
                <input
                    id={`${id}-reason`}
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    placeholder={isCredit ? 'Возврат товара, ошибка выставления...' : 'Дополнительные услуги...'}
                />
            </div>
            <div className={s.footer}>
                <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={onCancel}>{t('Отмена')}</button>
                <button type="submit" className={`${s.btn} ${s.btnPrimary}`}>
                    {isCredit ? 'Создать кредит-ноту' : 'Создать корректировку'}
                </button>
            </div>
        </form>
    );
});

const CancelConfirm = memo(({ onConfirm, onCancel }: {
    onConfirm: () => void;
    onCancel: () => void;
}) => {
    const { t } = useTranslation();

    return (
        <div className={s.form}>
            <div className={`${s.warning} ${s.danger}`}>
                <span>⛔</span>
                <span>{t('Инвойс будет отменён. Связанные активные платежи Mollie также будут отменены. Это действие нельзя отменить.')}</span>
            </div>
            <div className={s.footer}>
                <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={onCancel}>{t('Не отменять')}</button>
                <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={onConfirm}>{t('Да, отменить инвойс')}</button>
            </div>
        </div>
    );
});

// --- Titles ---

const TITLES: Record<InvoiceAction['type'], string> = {
    'record-payment': 'Зарегистрировать оплату',
    'confirm-paid': 'Подтвердить как оплаченный',
    'create-credit': 'Кредит-нота',
    'create-debit': 'Корректировка',
    'cancel': 'Отменить инвойс',
};

const SUBTITLES: Record<InvoiceAction['type'], string> = {
    'record-payment': 'Частичная или полная оплата, не через Mollie',
    'confirm-paid': 'Черновик будет помечен как оплаченный',
    'create-credit': 'Уменьшает задолженность клиента',
    'create-debit': 'Увеличивает задолженность клиента',
    'cancel': '',
};

// --- Main component ---

export const InvoiceActionModal = memo(({ action, onConfirm, onClose }: Props) => {
    const handlePayment = (data: RecordPaymentResult) =>
        onConfirm({ type: 'record-payment', data });

    const handleConfirmPaid = (data: ConfirmPaidResult) =>
        onConfirm({ type: 'confirm-paid', data });

    const handleAdjustment = (kind: 'CREDIT' | 'DEBIT') => (data: AdjustmentResult) =>
        onConfirm({ type: kind === 'CREDIT' ? 'create-credit' : 'create-debit', data });

    const handleCancel = () => onConfirm({ type: 'cancel' });

    return (
        <Modal isOpen={Boolean(action)} onClose={onClose} lazy>
            {action && (
                <div className={s.modal}>
                    <div className={s.header}>
                        <div className={s.title}>{TITLES[action.type]}</div>
                        {SUBTITLES[action.type] && (
                            <div className={s.subtitle}>{SUBTITLES[action.type]}</div>
                        )}
                    </div>

                    {action.type === 'record-payment' && (
                        <RecordPaymentForm invoice={action.invoice} onSubmit={handlePayment} onCancel={onClose} />
                    )}
                    {action.type === 'confirm-paid' && (
                        <ConfirmPaidForm invoice={action.invoice} onSubmit={handleConfirmPaid} onCancel={onClose} />
                    )}
                    {(action.type === 'create-credit' || action.type === 'create-debit') && (
                        <AdjustmentForm
                            kind={action.type === 'create-credit' ? 'CREDIT' : 'DEBIT'}
                            invoice={action.invoice}
                            onSubmit={handleAdjustment(action.type === 'create-credit' ? 'CREDIT' : 'DEBIT')}
                            onCancel={onClose}
                        />
                    )}
                    {action.type === 'cancel' && (
                        <CancelConfirm onConfirm={handleCancel} onCancel={onClose} />
                    )}
                </div>
            )}
        </Modal>
    );
});
