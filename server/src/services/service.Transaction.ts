import { ExpenseCategory, PaymentMethod, TransactionType, Transaction as TTransaction } from '@prisma/client';

import prisma from '../../prisma/prisma-client'
import dayjs from 'dayjs';
import { syncMolliePayments } from './service.MollieSync';

const Transaction = prisma.transaction
const MOLLIE_SYNC_INTERVAL_MS = 2 * 60 * 1000;
const REVERSAL_STATUSES = ['charged_back', 'chargeback'];

let lastMollieSyncAt = 0;
let mollieSyncPromise: Promise<void> | null = null;

export interface FinancialTransaction {
    id: string;
    type: TransactionType;
    amount: number;
    category: ExpenseCategory;
    description: string | null;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
    paymentMethod: PaymentMethod;
    currency: string;
    source: 'MANUAL' | 'MOLLIE';
    status: string;
    externalId?: string | null;
    customerName?: string | null;
}


export interface ITransactionsAttributes {
    id?: number;
    type?: string;
    amount?: string;
    category?: string;
    description?: string;
}

export enum Month {
    ALL = 'all',
    JANUARY = 'january',
    FEBRUARY = 'february',
    MARCH = 'march',
    APRIL = 'april',
    MAY = 'may',
    JUNE = 'june',
    JULY = 'july',
    AUGUST = 'august',
    SEPTEMBER = 'september',
    OCTOBER = 'october',
    NOVEMBER = 'november',
    DECEMBER = 'december',
}
export interface GetTransactionsParams {
    _sortBy?: 'id' | 'category' | 'date' | 'createdAt';
    _order?: 'asc' | 'desc';
    _month?: Month;
    _year?: string | number;
    _q?: string,
    _type?: TransactionType,
    _page?: string | number;
    _limit?: string | number;
    month?: number;
    year?: number;
}

export interface PaginatedTransactions {
    items: FinancialTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export type TransactionChartPeriod = 'week' | 'month' | 'threeMonths' | 'year';

const triggerMolliePaymentsRefresh = () => {
    if (Date.now() - lastMollieSyncAt < MOLLIE_SYNC_INTERVAL_MS) {
        return;
    }

    if (!mollieSyncPromise) {
        mollieSyncPromise = syncMolliePayments()
            .then(() => {
                lastMollieSyncAt = Date.now();
            })
            .catch((error) => {
                console.error('Unable to refresh Mollie payments for transactions:', error);
            })
            .finally(() => {
                mollieSyncPromise = null;
            });
    }
};

const mapMolliePaymentMethod = (method: string): PaymentMethod => {
    if (method === 'creditcard') {
        return PaymentMethod.CARD;
    }

    return PaymentMethod.BANK_TRANSFER;
};

const getCustomerName = (customer?: {
    givenName: string | null;
    familyName: string | null;
    consumerName: string | null;
    email: string | null;
} | null) => {
    const fullName = [customer?.givenName, customer?.familyName].filter(Boolean).join(' ');

    return fullName || customer?.consumerName || customer?.email || null;
};

const getFinancialTransactions = async (): Promise<FinancialTransaction[]> => {
    const [manualTransactions, molliePayments] = await Promise.all([
        Transaction.findMany(),
        prisma.payment.findMany({
            where: {
                OR: [
                    { status: 'paid' },
                    { status: { in: REVERSAL_STATUSES } },
                    { refundedAmount: { gt: 0 } },
                    { chargedBackAmount: { gt: 0 } },
                ],
            },
            include: {
                customer: {
                    select: {
                        givenName: true,
                        familyName: true,
                        consumerName: true,
                        email: true,
                    },
                },
            },
        }),
    ]);

    const manual: FinancialTransaction[] = manualTransactions.map((transaction) => ({
        ...transaction,
        id: String(transaction.id),
        currency: 'EUR',
        source: 'MANUAL',
        status: 'completed',
    }));

    const mollie: FinancialTransaction[] = [];

    molliePayments.forEach((payment) => {
        const amount = Number(payment.amountValue);
        const refundedAmount = Number(payment.refundedAmount);
        const chargedBackAmount = Number(payment.chargedBackAmount);
        const isChargedBack = REVERSAL_STATUSES.includes(payment.status);
        const reversalAmount = refundedAmount + (chargedBackAmount || (isChargedBack ? amount : 0));
        const customerName = getCustomerName(payment.customer);
        const description = customerName
            ? `${payment.description ?? 'Mollie payment'} · ${customerName}`
            : payment.description ?? 'Mollie payment';
        const common = {
            category: ExpenseCategory.OTHER,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
            paymentMethod: mapMolliePaymentMethod(payment.method),
            currency: payment.amountCurrency,
            source: 'MOLLIE' as const,
            externalId: payment.mollieId,
            customerName,
        };

        if (payment.paidAt) {
            mollie.push({
                ...common,
                id: `mollie:${payment.mollieId ?? payment.id}`,
                type: TransactionType.INCOME,
                amount,
                description,
                date: payment.paidAt,
                status: 'paid',
            });
        }

        if (reversalAmount > 0) {
            mollie.push({
                ...common,
                id: `mollie-reversal:${payment.mollieId ?? payment.id}`,
                type: TransactionType.EXPENSE,
                amount: reversalAmount,
                description: `Возврат/отмена Mollie · ${description}`,
                date: payment.adjustmentAt ?? payment.paidAt ?? payment.createdAt,
                status: chargedBackAmount > 0 || isChargedBack ? 'charged_back' : 'refunded',
            });
        }
    });

    return manual.concat(mollie);
};

const sortKeyFor = (transaction: FinancialTransaction, sortBy: string) => {
    if (sortBy === 'category') return transaction.category;
    if (sortBy === 'id') return transaction.id;
    if (sortBy === 'createdAt') return transaction.createdAt.getTime();
    return transaction.date.getTime();
};

const getFilteredTransactions = async (params: GetTransactionsParams) => {
    let { _sortBy = 'createdAt', _q, _type, _month = Month.ALL, _year = dayjs().year() } = params;
    const order = params._order?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const normalizedQuery = _q?.trim().toLowerCase();
    const requestedType = !_type
        ? null
        : _type.toLocaleLowerCase() === 'приход'
            ? TransactionType.INCOME
            : TransactionType.EXPENSE;
    const monthIndex = _month === Month.ALL ? -1 : Object.values(Month).indexOf(_month) - 1;
    const startDate = monthIndex >= 0 ? dayjs().year(Number(_year)).month(monthIndex).startOf('month') : null;
    const endDate = startDate?.endOf('month') ?? null;
    const transactions = await getFinancialTransactions();

    return transactions
        .filter((transaction) => {
            const transactionDate = dayjs(transaction.date);
            const matchesQuery = !normalizedQuery || [
                transaction.description,
                transaction.category,
                transaction.externalId,
                transaction.customerName,
            ].some((value) => value?.toLowerCase().includes(normalizedQuery));
            const matchesType = !requestedType || transaction.type === requestedType;
            const matchesMonth = !startDate || !endDate || (
                transactionDate.isAfter(startDate.subtract(1, 'millisecond'))
                && transactionDate.isBefore(endDate.add(1, 'millisecond'))
            );

            return matchesQuery && matchesType && matchesMonth;
        })
        .sort((left, right) => {
            const leftValue = sortKeyFor(left, _sortBy);
            const rightValue = sortKeyFor(right, _sortBy);
            const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;

            return order === 'asc' ? comparison : -comparison;
        });
};

const toDateKey = (date: dayjs.Dayjs) => date.format('YYYY-MM-DD');

const getMondayStartOfWeek = (date: dayjs.Dayjs) => {
    const weekday = date.day();
    const daysFromMonday = weekday === 0 ? 6 : weekday - 1;

    return date.subtract(daysFromMonday, 'day').startOf('day');
};

const formatChartLabel = (date: dayjs.Dayjs, period: TransactionChartPeriod) => {
    if (period === 'year' || period === 'threeMonths') {
        return date.format('MMM');
    }

    return date.format('DD.MM');
};

const buildChartBuckets = (period: TransactionChartPeriod) => {
    const now = dayjs();

    if (period === 'week') {
        const start = getMondayStartOfWeek(now);

        return Array.from({ length: 7 }, (_, index) => {
            const date = start.add(index, 'day');

            return {
                key: toDateKey(date),
                label: formatChartLabel(date, period),
                start: date.startOf('day'),
                end: date.endOf('day'),
            };
        });
    }

    if (period === 'month') {
        const start = now.startOf('month');
        const daysInMonth = now.daysInMonth();

        return Array.from({ length: daysInMonth }, (_, index) => {
            const date = start.add(index, 'day');

            return {
                key: toDateKey(date),
                label: formatChartLabel(date, period),
                start: date.startOf('day'),
                end: date.endOf('day'),
            };
        });
    }

    const monthsCount = period === 'threeMonths' ? 3 : 12;
    const start = now.subtract(monthsCount - 1, 'month').startOf('month');

    return Array.from({ length: monthsCount }, (_, index) => {
        const date = start.add(index, 'month');

        return {
            key: date.format('YYYY-MM'),
            label: formatChartLabel(date, period),
            start: date.startOf('month'),
            end: date.endOf('month'),
        };
    });
};

export const getAllTransactions = async (params: GetTransactionsParams): Promise<PaginatedTransactions> => {
    triggerMolliePaymentsRefresh();
    const filtered = await getFilteredTransactions(params);
    const page = Math.max(Number(params._page) || 1, 1);
    const limit = Math.min(Math.max(Number(params._limit) || 20, 1), 100);
    const total = filtered.length;

    return {
        items: filtered.slice((page - 1) * limit, page * limit),
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
    };
};
export const createTransaction = async (data: TTransaction) => {

    return Transaction.create({
        data: {
            ...data,
            amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
            date: data.date ? new Date(data.date) : new Date(),
            paymentMethod: PaymentMethod[data?.paymentMethod.toLocaleUpperCase() as keyof typeof PaymentMethod],
        },
    });
};
export const getTransactionsSummary = async (params: GetTransactionsParams) => {
    triggerMolliePaymentsRefresh();
    const transactions = await getFilteredTransactions(params);

    const income = transactions
        .filter((t) => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
        .filter((t) => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);

    return {
        income,
        expense,
        balance: income - expense,
    };
};

export const getTransactionsChart = async (period: TransactionChartPeriod = 'week') => {
    triggerMolliePaymentsRefresh();
    const safePeriod: TransactionChartPeriod = ['week', 'month', 'threeMonths', 'year'].includes(period)
        ? period
        : 'week';
    const buckets = buildChartBuckets(safePeriod);
    const firstBucket = buckets[0];
    const lastBucket = buckets[buckets.length - 1];

    const transactions = (await getFinancialTransactions()).filter((transaction) => {
        const date = dayjs(transaction.date);

        return date.isAfter(firstBucket.start.subtract(1, 'millisecond'))
            && date.isBefore(lastBucket.end.add(1, 'millisecond'));
    });

    const items = buckets.map((bucket) => {
        const bucketTransactions = transactions.filter((transaction) => {
            const transactionDate = dayjs(transaction.date);

            return transactionDate.isAfter(bucket.start.subtract(1, 'millisecond'))
                && transactionDate.isBefore(bucket.end.add(1, 'millisecond'));
        });
        const income = bucketTransactions
            .filter((transaction) => transaction.type === TransactionType.INCOME)
            .reduce((sum, transaction) => sum + transaction.amount, 0);

        const expense = bucketTransactions
            .filter((transaction) => transaction.type === TransactionType.EXPENSE)
            .reduce((sum, transaction) => sum + transaction.amount, 0);

        return {
            key: bucket.key,
            label: bucket.label,
            income,
            expense,
        };
    });

    const incomeTotal = items.reduce((sum, item) => sum + item.income, 0);
    const expenseTotal = items.reduce((sum, item) => sum + item.expense, 0);

    return {
        period: safePeriod,
        updatedAt: new Date(),
        incomeTotal,
        expenseTotal,
        balance: incomeTotal - expenseTotal,
        items,
    };
};

export const deleteTransactionById = async (transactionId: number) => {
    return Transaction.delete({
        where: {
            id: transactionId,
        },
    });
}
