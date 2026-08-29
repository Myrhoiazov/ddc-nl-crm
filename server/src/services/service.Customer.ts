import { Customer } from '@mollie/api-client';
import prisma from '../../prisma/prisma-client'


export interface TCustomer {
    id?: number;
    mollieId: string
    city: string
    country: string
    email: string
    phone?: string
    consumerName: string
    familyName: string
    givenName: string
    postalCode: string
    streetAndNumber: string
    consumerAccount: string
    consumerBic: string
}

export const createCustomer = async (mollieCustomer: Customer) => {
    const newCustomer = await prisma.customer.create({
        data: {
            mollieId: mollieCustomer.id,
            email: mollieCustomer.email,
            givenName: mollieCustomer?.name.split(" ")[0] ?? '',
            familyName: mollieCustomer?.name.split(" ").slice(-1)[0] ?? '',
        }
    });

    return newCustomer;
};

export const updateCustomer = async (mollieCustomer: TCustomer) => {
    const newCustomer = await prisma.customer.update({
        where: {
            mollieId: mollieCustomer.mollieId
        },
        data: {
            ...mollieCustomer
        }
    });

    return newCustomer;
};

export const deleteAllCustomers = async () => {
    await prisma.customer.deleteMany({});
}

export const getCostomerByMollieId = async (id: string) => {
    return await prisma.customer.findUnique({
        where: {
            mollieId: id
        }
    })

}