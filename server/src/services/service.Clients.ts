import { Client as TClient, Prisma } from '@prisma/client';
import prisma from '../../prisma/prisma-client'

const Client = prisma.client
const paymentIssueStatuses = ['failed', 'canceled', 'charged_back', 'chargeback'];

export type ClientPaymentStatusFilter =
    | 'all'
    | 'linked'
    | 'unlinked'
    | 'active_subscription'
    | 'paid'
    | 'payment_issue';

export interface IClientAttributes {
    id: number;
    firstName?: string;
    lastName?: string;
    birthday?: string;
    phoneNumber?: string;
    email?: string;
    branchId?: number | null;
    image_3d?: boolean;
    document?: boolean;
    anamnesis?: string;
    description?: string;
    image?: string;
}

export interface GetClientsParams {
    _sortBy?: 'firstName' | 'createdAt';
    _order?: 'asc' | 'desc';
    _q?: string,
    _branchId?: string;
    _paymentStatus?: ClientPaymentStatusFilter;
}

export interface CreateClientOptions {
    mollieCustomerId?: number | null;
    payerRelation?: string;
    groupIds?: number[];
}

const normalizeClientData = (data: Partial<TClient> & { status?: unknown }) => {
    delete data.id;
    delete data.status;
    delete data.createdAt;
    delete data.expiresAt;
    delete data.image_3d;
    delete data.document;
    delete data.anamnesis;
    delete data.description;

    if ('branchId' in data) {
        const branchId = Number(data.branchId);
        data.branchId = Number.isFinite(branchId) && branchId > 0 ? branchId : null;
    }

    for (const field of ['firstName', 'lastName', 'birthday', 'phoneNumber', 'email', 'social'] as const) {
        if (field in data) {
            const value = data[field];
            data[field] = typeof value === 'string' && value.trim() ? value.trim() : null;
        }
    }

    return data;
}

export const createClient = async (data: TClient, options: CreateClientOptions = {}) => {
    const clientData = normalizeClientData(data as Partial<TClient> & { status?: unknown });

    return prisma.$transaction(async (transaction) => {
        const newClient = await transaction.client.create({
            data: {
                ...clientData,
                groupMemberships: options.groupIds?.length ? {
                    create: options.groupIds.map((groupId) => ({ groupId })),
                } : undefined,
            },
            include: {
                branch: true,
                groupMemberships: { include: { group: true } },
            },
        });

        if (options.mollieCustomerId) {
            const customer = await transaction.customer.findUnique({
                where: { id: options.mollieCustomerId },
            });

            if (!customer) {
                throw new Error('MOLLIE_CUSTOMER_NOT_FOUND');
            }

            const payerRelation = options.payerRelation || 'unknown';
            const existingLinksCount = await transaction.customerClientLink.count({
                where: { customerId: customer.id },
            });
            const isPrimary = existingLinksCount === 0;

            await transaction.customerClientLink.upsert({
                where: {
                    customerId_clientId: {
                        customerId: customer.id,
                        clientId: newClient.id,
                    },
                },
                update: {
                    payerRelation,
                    linkSource: 'manual',
                    isPrimary,
                },
                create: {
                    customerId: customer.id,
                    clientId: newClient.id,
                    payerRelation,
                    linkSource: 'manual',
                    isPrimary,
                },
            });

            if (!customer.clientId) {
                await transaction.customer.update({
                    where: { id: customer.id },
                    data: {
                        clientId: newClient.id,
                        payerRelation,
                        linkSource: 'manual',
                    },
                });
            }
        }

        return newClient;
    });
};

export const getAllClients = async (params: GetClientsParams) => {

    const {
        _sortBy = 'createdAt',
        _order = 'desc',
        _q,
        _branchId,
        _paymentStatus = 'all',
    } = params;
    const branchId = _branchId ? Number(_branchId) : null;

    const paymentStatusWhere: Record<ClientPaymentStatusFilter, Prisma.ClientWhereInput> = {
        all: {},
        linked: {
            mollieLinks: { some: {} },
        },
        unlinked: {
            mollieLinks: { none: {} },
        },
        active_subscription: {
            mollieLinks: {
                some: {
                    customer: {
                        subscriptions: {
                            some: { status: 'active' },
                        },
                    },
                },
            },
        },
        paid: {
            mollieLinks: {
                some: {
                    customer: {
                        payments: {
                            some: { status: 'paid' },
                        },
                    },
                },
            },
        },
        payment_issue: {
            mollieLinks: {
                some: {
                    customer: {
                        payments: {
                            some: { status: { in: paymentIssueStatuses } },
                        },
                    },
                },
            },
        },
    };

    const whereClause: Prisma.ClientWhereInput = {
        ...(!!_q && {
            OR: [
                { firstName: { contains: _q } },
                { lastName: { contains: _q } },
                { email: { contains: _q } },
                { phoneNumber: { contains: _q } },
            ],
        }),
        ...(!!branchId && {
            branchId,
        }),
        ...(paymentStatusWhere[_paymentStatus] || {}),
    }

    const clients = await Client.findMany({
        where: whereClause,
        orderBy: {
            [_sortBy]: _order,
        },
        include: {
            branch: true,
            groupMemberships: { include: { group: true } },
            mollieLinks: {
                orderBy: [
                    { isPrimary: 'desc' },
                    { createdAt: 'asc' },
                ],
                take: 1,
                select: {
                    customerId: true,
                    isPrimary: true,
                },
            },
        },
    });

    return clients;
};

export const getClientById = async (id: number) => {
    const client = await Client.findUnique({
        where: { id },
        include: {
            branch: true,
            groupMemberships: { include: { group: true } },
        },
    });

    if (!client) return null;

    return client;
};

export const updateClient = async (id: number, data: Partial<TClient>, groupIds?: number[]) => {
    const clientData = normalizeClientData(data);

    return prisma.$transaction(async (transaction) => {
        if (groupIds) {
            await transaction.clientDanceGroup.deleteMany({ where: { clientId: id } });
        }
        return transaction.client.update({
            where: { id },
            data: {
                ...clientData,
                groupMemberships: groupIds?.length ? {
                    create: groupIds.map((groupId) => ({ groupId })),
                } : undefined,
            },
            include: {
                branch: true,
                groupMemberships: { include: { group: true } },
            },
        });
    });
};

export const deleteClient = async (id: number) => {
    return Client.delete({
        where: { id },
    });
};

