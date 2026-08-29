import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { Input } from '@/shared/ui/Input/Input';
import Textarea from '@/shared/ui/Textarea/Textarea';
import { TransactionSelect, TransactionType } from '@/entities/TransactionType';
import { Transaction } from '@/entities/Transaction';
import { PaymentMethod, PaymentMethodSelect } from '@/entities/PaymentMethod';
import { TransactionCategory, TransactionCategorySelect } from '@/entities/TransactionCategory';

export interface TransactionCardProps {
    className?: string;
    data?: Transaction;
    error?: string;
    isLoading?: boolean;
    readonly?: boolean;
    onChangeDate?: (value?: string) => void;
    onChangeSum?: (value?: string) => void;
    onChangeDescription?: (value?: string) => void;
    onChangeTransactionType?: (type: TransactionType) => void;
    onChangePaymentMethod?: (type: PaymentMethod) => void;
    onChangeTransactionCategory?: (type: TransactionCategory) => void;
}

export const TransactionCard = memo((props: TransactionCardProps) => {
    const {
        className,
        data,
        readonly,
        onChangeDate,
        onChangeSum,
        onChangeTransactionType,
        onChangeDescription,
        onChangePaymentMethod,
        onChangeTransactionCategory,
    } = props;
    const { t } = useTranslation();

    return (
        <>
            <TransactionSelect
                onChange={onChangeTransactionType}
                value={data?.type}
                readonly={readonly}
            />
            <PaymentMethodSelect
                onChange={onChangePaymentMethod}
                value={data?.paymentMethod}
                readonly={readonly}
            />
            <TransactionCategorySelect
                onChange={onChangeTransactionCategory}
                value={data?.category}
            />
            <Input
                fullWidth
                label="Дата:"
                type="date"
                placeholder={t('12.02.2025')}
                onChange={onChangeDate}
                value={data?.date ?? ''}
            />
            <Input
                fullWidth
                label="Сумма:"
                type="text"
                placeholder={t('100.00')}
                onChange={onChangeSum}
                value={data?.amount ?? ''}
            />
            <Textarea
                placeholder="Дополнительная информация:"
                fullWidth
                value={data?.description}
                onChange={onChangeDescription}
            />
        </>
    );
});

export default TransactionCard;
