import dayjs from 'dayjs';
import prisma from '../../prisma/prisma-client';

const paymentIssueStatuses = ['failed', 'canceled', 'expired', 'charged_back', 'chargeback'];

const toNumber = (value: unknown) => {
    if (!value) {
        return 0;
    }

    return Number(value);
};

export const getMollieDashboardSummary = async () => {
    const monthStart = dayjs().startOf('month').toDate();
    const monthEnd = dayjs().endOf('month').toDate();

    const [
        totalCustomers,
        activeSubscriptions,
        validMandates,
        paidThisMonth,
        failedPayments,
        monthlyPayments,
        latestFailedPayments,
    ] = await Promise.all([
        prisma.customer.count(),
        prisma.subscription.count({
            where: {
                status: 'active',
            },
        }),
        prisma.mandate.count({
            where: {
                status: 'valid',
            },
        }),
        prisma.payment.count({
            where: {
                status: 'paid',
                paidAt: {
                    gte: monthStart,
                    lte: monthEnd,
                },
            },
        }),
        prisma.payment.count({
            where: {
                status: {
                    in: paymentIssueStatuses,
                },
            },
        }),
        prisma.payment.findMany({
            where: {
                status: 'paid',
                paidAt: {
                    gte: monthStart,
                    lte: monthEnd,
                },
            },
            select: {
                amountValue: true,
            },
        }),
        prisma.payment.findMany({
            where: {
                status: {
                    in: paymentIssueStatuses,
                },
            },
            include: {
                customer: {
                    include: {
                        client: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                phoneNumber: true,
                            },
                        },
                        clientLinks: {
                            select: {
                                id: true,
                                payerRelation: true,
                                linkSource: true,
                                isPrimary: true,
                                client: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        email: true,
                                        phoneNumber: true,
                                    },
                                },
                            },
                        },
                    },
                },
                subscription: {
                    include: {
                        customer: {
                            include: {
                                client: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        email: true,
                                        phoneNumber: true,
                                    },
                                },
                                clientLinks: {
                                    select: {
                                        id: true,
                                        payerRelation: true,
                                        linkSource: true,
                                        isPrimary: true,
                                        client: {
                                            select: {
                                                id: true,
                                                firstName: true,
                                                lastName: true,
                                                email: true,
                                                phoneNumber: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: 5,
        }),
    ]);

    const monthlyRevenue = monthlyPayments.reduce(
        (sum, payment) => sum + toNumber(payment.amountValue),
        0,
    );

    return {
        period: {
            monthStart,
            monthEnd,
        },
        totalCustomers,
        activeSubscriptions,
        validMandates,
        paidThisMonth,
        failedPayments,
        monthlyRevenue,
        currency: 'EUR',
        latestFailedPayments: latestFailedPayments.map((payment) => ({
            id: payment.id,
            mollieId: payment.mollieId,
            status: payment.status,
            amountValue: toNumber(payment.amountValue),
            amountCurrency: payment.amountCurrency,
            description: payment.description,
            paidAt: payment.paidAt,
            updatedAt: payment.updatedAt,
            customer: (payment.customer ?? payment.subscription?.customer)
                ? {
                    id: (payment.customer ?? payment.subscription.customer).id,
                    mollieId: (payment.customer ?? payment.subscription.customer).mollieId,
                    email: (payment.customer ?? payment.subscription.customer).email,
                    givenName: (payment.customer ?? payment.subscription.customer).givenName,
                    familyName: (payment.customer ?? payment.subscription.customer).familyName,
                    client: (payment.customer ?? payment.subscription.customer).client,
                    clientLinks: (payment.customer ?? payment.subscription.customer).clientLinks,
                }
                : null,
            subscription: payment.subscription
                ? {
                    id: payment.subscription.id,
                    mollieId: payment.subscription.mollieId,
                    status: payment.subscription.status,
                    description: payment.subscription.description,
                }
                : null,
        })),
    };
};
