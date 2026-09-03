import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { MollieClient, MolliePayment } from '@/entities/MollieClient';

export const paymentDate = (payment: MolliePayment) => payment.paidAt || payment.createdAt || payment.updatedAt;

export const formatDate = (value?: string) => {
    if (!value) {
        return 'Без даты';
    }

    return new Date(value).toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

export const formatAmount = (payment: MolliePayment) => {
    const amount = Number(payment.amountValue ?? 0);
    const currency = payment.amountCurrency || 'EUR';

    return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency,
    }).format(Number.isFinite(amount) ? amount : 0);
};

export const paymentStatusLabel: Record<string, string> = {
    paid: 'Оплачено',
    canceled: 'Отменено',
    cancelled: 'Отменено',
    failed: 'Ошибка',
    expired: 'Истекло',
    pending: 'Ожидает',
    open: 'Открыто',
    charged_back: 'Chargeback',
    chargeback: 'Chargeback',
};

export const usePaymentHistory = (customerId: string) => {
    const [payments, setPayments] = useState<MolliePayment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    const loadPayments = useCallback(() => {
        setIsLoading(true);
        setError(false);

        $apiPrivate.get<MollieClient>(`/mollie/customers/${customerId}`, {
            params: { _ts: Date.now() },
            headers: { 'Cache-Control': 'no-cache' },
        })
            .then(({ data }) => {
                setPayments(data.payments ?? []);
            })
            .catch(() => {
                setError(true);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [customerId]);

    useEffect(() => {
        loadPayments();

        window.addEventListener('focus', loadPayments);

        return () => {
            window.removeEventListener('focus', loadPayments);
        };
    }, [loadPayments]);

    const loadPaymentInvoice = async (payment: MolliePayment) => {
        const response = await $apiPrivate.get(`/mollie/payments/${payment.id}/invoice.pdf`, {
            responseType: 'blob',
        });
        return URL.createObjectURL(response.data);
    };

    const previewPaymentInvoice = async (payment: MolliePayment) => {
        const previewWindow = window.open('', '_blank');
        if (previewWindow) {
            previewWindow.opener = null;
            previewWindow.document.title = 'Загрузка инвойса...';
        }
        try {
            const url = await loadPaymentInvoice(payment);
            if (previewWindow) {
                previewWindow.location.href = url;
            } else {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch {
            previewWindow?.close();
            toast.error('Не удалось открыть инвойс платежа');
        }
    };

    const downloadPaymentInvoice = async (payment: MolliePayment) => {
        try {
            const url = await loadPaymentInvoice(payment);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${payment.mollieId || `mollie-payment-${payment.id}`}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Не удалось скачать инвойс платежа');
        }
    };

    const groupedPayments = useMemo(() => {
        const sortedPayments = [...payments].sort((first, second) => {
            const firstDate = paymentDate(first) ? new Date(paymentDate(first) as string).getTime() : 0;
            const secondDate = paymentDate(second) ? new Date(paymentDate(second) as string).getTime() : 0;

            return secondDate - firstDate;
        });

        return sortedPayments.reduce<Record<string, MolliePayment[]>>((acc, payment) => {
            const date = formatDate(paymentDate(payment));
            acc[date] = acc[date] ? [...acc[date], payment] : [payment];
            return acc;
        }, {});
    }, [payments]);

    return {
        payments,
        isLoading,
        error,
        groupedPayments,
        previewPaymentInvoice,
        downloadPaymentInvoice,
    };
};
