import 'dotenv/config';
import {
    ClientLanguage, ExpenseCategory, GroupLevel, InvoiceStatus,
    LoyaltyLevel, PaymentMethod, PrismaClient, TransactionType,
} from '@prisma/client';

// Local demo data only. No external APIs, mail delivery, or Mollie records.
const prisma = new PrismaClient();
const marker = 'ddc-demo-seed-v1';
const today = new Date();
today.setUTCHours(12, 0, 0, 0);
const daysFromToday = (days: number) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + days);
    return date;
};

const firstNames = [
    'Anna', 'Sofia', 'Emma', 'Olivia', 'Mila', 'Eva', 'Nora', 'Julia', 'Sara', 'Lina',
    'Noah', 'Liam', 'Lucas', 'Milan', 'Adam', 'Daan', 'Max', 'Leon', 'Finn', 'Alex',
];
const lastNames = ['de Vries', 'Jansen', 'Kovalenko', 'Bakker', 'Melnyk'];
const cities = ['Amsterdam', 'Rotterdam', 'Utrecht', 'Den Haag'];
const styles = ['Hip-Hop', 'Contemporary', 'Jazz Funk', 'Heels', 'Breaking', 'Kids Dance'];
const levels = [GroupLevel.START, GroupLevel.FAN, GroupLevel.PRO];
const languages = [ClientLanguage.NL, ClientLanguage.EN, ClientLanguage.RU];
const loyaltyLevels = [LoyaltyLevel.BRONZE, LoyaltyLevel.SILVER, LoyaltyLevel.GOLD, LoyaltyLevel.PLATINUM];
const methods = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.BANK_TRANSFER];
const statuses = [
    InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.ISSUED,
    InvoiceStatus.OVERDUE, InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED,
];

async function main() {
    if (process.env.MODE !== 'development' || process.env.NODE_ENV === 'production') {
        throw new Error('Demo seed requires MODE=development and must not run in production.');
    }

    const result = await prisma.$transaction(async (tx) => {
        if (await tx.businessBrand.findUnique({ where: { slug: marker } })) {
            return { skipped: true, reason: 'Demo dataset already exists; no changes made.' };
        }

        const actor = await tx.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { id: 'asc' } });
        const organization = await tx.legalOrganization.create({
            data: {
                legalName: 'DDC Demo Dance Academy',
                registrationAddress: 'Demo Studio 1', city: 'Amsterdam', countryCode: 'NL',
                email: 'office@ddc-demo.example.test', website: 'https://ddc-demo.example.test',
            },
        });
        const brands = [];
        const brandNames = ['DDC Demo Academy', 'DDC Demo Kids'];
        for (let index = 0; index < brandNames.length; index += 1) {
            const name = brandNames[index];
            brands.push(await tx.businessBrand.create({
                data: {
                    organizationId: organization.id, name,
                    slug: index === 0 ? marker : `${marker}-kids`,
                    email: 'office@ddc-demo.example.test',
                    address: 'Demo Studio 1, Amsterdam',
                    primaryColor: index === 0 ? '#6c4dd8' : '#e29032',
                    isDefault: index === 0 && !(await tx.businessBrand.findFirst({ where: { isDefault: true } })),
                },
            }));
        }

        const branches = [];
        const halls = [];
        for (let index = 0; index < cities.length; index += 1) {
            const city = cities[index];
            branches.push(await tx.branch.create({
                data: {
                    name: `DDC Demo ${city}`, city, address: `Demo Studio ${index + 1}`,
                    email: `studio${index + 1}@ddc-demo.example.test`,
                    description: 'Демонстрационная локация танцевальной школы.',
                },
            }));
            for (const room of ['A', 'B']) {
                halls.push(await tx.hall.create({
                    data: { name: `Demo ${city} — ${room}`, capacity: 20 },
                }));
            }
        }

        const teachers = [];
        for (let i = 0; i < 8; i += 1) {
            teachers.push(await tx.choreographer.create({
                data: {
                    firstName: firstNames[i], lastName: 'Demo Instructor',
                    email: `teacher${i + 1}@ddc-demo.example.test`, experience: 3 + i,
                    category: levels[i % levels.length], showOnSite: false,
                    description: `Демо-преподаватель: ${styles[i % styles.length]}.`,
                },
            }));
        }
        await tx.danceStyle.createMany({
            data: styles.map((name) => ({ name, nameEn: name, description: `Демо: ${name}`, isActive: true })),
        });

        const groups = [];
        for (let i = 0; i < 12; i += 1) {
            const branchIndex = i % branches.length;
            const block = Math.floor(i / branches.length);
            const hour = 16 + block * 2;
            groups.push(await tx.danceGroup.create({
                data: {
                    name: `Demo ${styles[i % styles.length]} ${cities[branchIndex]} ${levels[block]}`,
                    style: styles[i % styles.length], level: levels[block],
                    maxParticipants: 20, lessonPriceCents: 1500 + block * 250,
                    branchId: branches[branchIndex].id,
                    hallId: halls[branchIndex * 2 + block % 2].id,
                    choreographerId: teachers[branchIndex * 2 + block % 2].id,
                    slots: {
                        create: ['Понедельник', 'Четверг'].map((dayOfWeek) => ({
                            dayOfWeek, startTime: `${hour}:00`, endTime: `${hour + 1}:00`,
                        })),
                    },
                },
            }));
        }

        for (let i = 0; i < 100; i += 1) {
            const group = groups[i % groups.length];
            const firstName = firstNames[i % firstNames.length];
            const lastName = lastNames[Math.floor(i / firstNames.length)];
            const email = `demo.student${String(i + 1).padStart(3, '0')}@example.test`;
            const client = await tx.client.create({
                data: {
                    firstName, lastName, email, branchId: group.branchId,
                    birthday: `${1985 + i % 28}-${String(1 + i % 12).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}`,
                    preferredLanguage: languages[i % languages.length],
                    description: `Демо-ученик ${i + 1}. Синтетические данные для проверки админки.`,
                    createdAt: daysFromToday(-180 + i),
                    document: i % 4 !== 0,
                    groupMemberships: { create: { groupId: group.id } },
                    statuses: { create: { loyaltyLevel: loyaltyLevels[i % loyaltyLevels.length], notes: 'Демонстрационный статус' } },
                    comments: {
                        create: {
                            text: ['Интересуется дополнительными занятиями.', 'Предпочитает вечернее расписание.', 'Готовится к выступлению.', 'Пришёл после пробного занятия.'][i % 4],
                            userId: actor?.id,
                        },
                    },
                },
            });

            const status = statuses[i % statuses.length];
            const brand = brands[i % brands.length];
            const totalCents = group.lessonPriceCents * 4;
            const paidAmountCents = status === InvoiceStatus.PAID ? totalCents
                : status === InvoiceStatus.PARTIALLY_PAID ? totalCents / 2 : 0;
            const issueDate = daysFromToday(status === InvoiceStatus.OVERDUE ? -45 : -7);
            const paidAt = daysFromToday(-2);
            await tx.invoice.create({
                data: {
                    number: `DEMO-${today.getUTCFullYear()}-${String(i + 1).padStart(4, '0')}`,
                    status, clientId: client.id, businessBrandId: brand.id,
                    billToName: `${firstName} ${lastName}`, billToEmail: email,
                    issueDate, dueDate: daysFromToday(status === InvoiceStatus.OVERDUE ? -15 : 14),
                    paidAt: status === InvoiceStatus.PAID ? paidAt : null,
                    totalCents, paidAmountCents, balanceDueCents: totalCents - paidAmountCents,
                    issuerName: brand.name, issuerLegalName: organization.legalName,
                    issuerEmail: brand.email, issuerAddress: brand.address,
                    issuerPrimaryColor: brand.primaryColor,
                    showPaymentButton: false, showPaymentQr: false,
                    note: 'Демонстрационный счёт. Не отправлять и не оплачивать.',
                    createdById: actor?.id, updatedById: actor?.id, createdAt: issueDate,
                    items: {
                        create: {
                            groupId: group.id, description: `${group.style} — 4 занятия`,
                            period: issueDate.toISOString().slice(0, 7), quantity: 4,
                            unitPriceCents: group.lessonPriceCents, totalCents,
                        },
                    },
                    payments: paidAmountCents > 0 ? {
                        create: {
                            amountCents: paidAmountCents, paidAt, method: i % 2 === 0 ? 'BANK_TRANSFER' : 'CASH',
                            reference: `DEMO-PAYMENT-${i + 1}`, note: 'Демонстрационная ручная оплата',
                            createdById: actor?.id,
                        },
                    } : undefined,
                    auditLogs: {
                        create: { action: 'DEMO_SEED', actorId: actor?.id, newValues: { status, totalCents, paidAmountCents } },
                    },
                },
            });
        }

        const expenses = [
            { category: ExpenseCategory.HUIS, description: 'Аренда студии', amount: 250 },
            { category: ExpenseCategory.KOMUNALKA, description: 'Коммунальные услуги', amount: 85 },
            { category: ExpenseCategory.PRODUCTS, description: 'Вода и расходные материалы', amount: 24.5 },
            { category: ExpenseCategory.AUTO, description: 'Транспорт на выступление', amount: 45 },
            { category: ExpenseCategory.OTHER, description: 'Реклама занятий', amount: 65 },
            { category: ExpenseCategory.HEALTH, description: 'Спортивный инвентарь', amount: 35 },
            { category: ExpenseCategory.PHARMACY, description: 'Аптечка студии', amount: 18.5 },
        ];
        await tx.transaction.createMany({
            data: Array.from({ length: 180 }, (_, i) => {
                const expense = expenses[Math.floor(i / 3) % expenses.length];
                const isExpense = i % 3 === 0;
                const date = daysFromToday(-Math.floor(i / 2));
                return {
                    type: isExpense ? TransactionType.EXPENSE : TransactionType.INCOME,
                    amount: isExpense ? expense.amount : 30 + (i % 6) * 15,
                    category: isExpense ? expense.category : ExpenseCategory.OTHER,
                    description: `DEMO: ${isExpense ? expense.description : 'Мастер-класс / разовое занятие'} #${i + 1}`,
                    date, createdAt: date, paymentMethod: methods[Math.floor(i / 3) % methods.length],
                };
            }),
        });

        return {
            students: 100, branches: 4, halls: 8, choreographers: 8, styles: 6,
            groups: 12, scheduleSlots: 24, memberships: 100, comments: 100,
            clientStatuses: 100, invoices: 100, invoicePayments: 34,
            transactions: 180, organizations: 1, brands: 2, mollie: 0,
        };
    }, { timeout: 60000 });

    console.log(JSON.stringify(result, null, 2));
}

main()
    .catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
