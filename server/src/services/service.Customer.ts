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

export const getCostomerByMollieId = async (id: string) => {
    return await prisma.customer.findUnique({
        where: {
            mollieId: id
        }
    })

}