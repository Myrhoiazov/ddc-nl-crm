import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { $apiPrivate } from '@/shared/api/api';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { Input } from '@/shared/ui/Input/Input';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import s from './MollieIncidents.module.scss';

type IncidentTypeFilter = 'all' | 'payments' | 'subscriptions' | 'customers';

interface IncidentCustomer {
    id: number;
    mollieId?: string;
    email?: string;
    givenName?: string;
    familyName?: string;
    payerName?: string;
    payerRelation?: string;
    linkSource?: string;
    client?: {
        id: number;
        firstName?: string;
        lastName?: string;
        email?: string;
        phoneNumber?: string;
    } | null;
    clientLinks?: {
        id: number;
        payerRelation?: string;
        linkSource?: string;
        isPrimary?: boolean;
        client?: {
            id: number;
            firstName?: string;
            lastName?: string;
            email?: string;
            phoneNumber?: string;
        };
    }[];
}

interface IncidentSubscription {
    id: number;
    mollieId?: string;
    status?: string;
    description?: string;
}

interface IncidentPayment {
    id: number;
    mollieId?: string;
    status: string;
    amountValue: string | number;
    amountCurrency: string;
}

interface MollieIncident {
    id: string;
    type: 'payment' | 'subscription' | 'customer';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    status: string;
    amountValue?: string | number;
    amountCurrency?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    customer?: IncidentCustomer | null;
    subscription?: IncidentSubscription | null;
    payment?: IncidentPayment | null;
}

interface MollieIncidentsResponse {
    items: MollieIncident[];
    totals: {
        total: number;
        payments: number;
        subscriptions: number;
        customers: number;
    };
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface IncidentFilters {
    _q: string;
    type: IncidentTypeFilter;
}

interface SyncResult {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
}

const PAGE_SIZE = 25;

const defaultFilters: IncidentFilters = {
    _q: '',
    type: 'all',
};

const typeOptions: SelectOption<IncidentTypeFilter>[] = [
    { value: 'all', content: 'Все проблемы' },
    { value: 'payments', content: 'Платежи' },
    { value: 'subscriptions', content: 'Подписки' },
    { value: 'customers', content: 'Клиенты' },
];

const formatAmount = (incident: MollieIncident) => {
    if (incident.amountValue === undefined || incident.amountValue === null) {
        return '—';
    }

    const amount = Number(incident.amountValue);

    return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: incident.amountCurrency || 'EUR',
    }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDate = (value?: string) => {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const getCustomerName = (customer?: IncidentCustomer | null) => {
    if (!customer) {
        return 'Платёжный профиль не привязан';
    }

    return customer.payerName
        || [customer.givenName, customer.familyName].filter(Boolean).join(' ')
        || customer.email
        || customer.mollieId
        || `Профиль #${customer.id}`;
};

const getCrmClientName = (customer?: IncidentCustomer | null) => {
    const crmClient = customer?.clientLinks?.[0]?.client || customer?.client;

    if (!crmClient) {
        return 'Ученик не привязан';
    }

    return [crmClient.firstName, crmClient.lastName].filter(Boolean).join(' ')
        || crmClient.email
        || `Ученик #${crmClient.id}`;
};

const getStudentLinks = (customer?: IncidentCustomer | null) => (
    customer?.clientLinks?.length
        ? customer.clientLinks
        : customer?.client?.id
            ? [{ id: customer.client.id, client: customer.client }]
            : []
);

const getIncidentHint = (incident: MollieIncident) => {
    if (incident.type === 'payment') {
        return 'Проверьте автосписание и свяжитесь с клиентом при необходимости.';
    }

    if (incident.type === 'subscription') {
        return 'У активной подписки нет валидного mandate — автосписание может не пройти.';
    }

    if (incident.status === 'missing_crm_client') {
        return 'Свяжите платёжный профиль Mollie с учеником, чтобы администратор видел оплату в карточке ученика.';
    }

    return 'Добавьте email, чтобы профиль клиента был пригоден для администрирования.';
};

export const MollieIncidents = memo(() => {
    const { t } = useTranslation();
    const [filters, setFilters] = useState<IncidentFilters>(defaultFilters);
    const [incidents, setIncidents] = useState<MollieIncident[]>([]);
    const [totals, setTotals] = useState<MollieIncidentsResponse['totals']>({
        total: 0,
        payments: 0,
        subscriptions: 0,
        customers: 0,
    });
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [resolvingIncidentId, setResolvingIncidentId] = useState<string>();
    const [error, setError] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string>();

    const firstItemNumber = total ? (page - 1) * PAGE_SIZE + 1 : 0;
    const lastItemNumber = Math.min(page * PAGE_SIZE, total);

    const loadIncidents = useCallback(async (nextFilters = filters, nextPage = page) => {
        setIsLoading(true);
        setError(false);

        try {
            const { data } = await $apiPrivate.get<MollieIncidentsResponse>('/mollie/incidents', {
                params: {
                    _page: nextPage,
                    _limit: PAGE_SIZE,
                    _q: nextFilters._q.trim() || undefined,
                    type: nextFilters.type === 'all' ? undefined : nextFilters.type,
                },
            });

            setIncidents(data.items);
            setTotals(data.totals);
            setTotal(data.total);
            setPage(data.page);
            setTotalPages(data.totalPages);
        } catch {
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [filters, page]);

    useEffect(() => {
        loadIncidents(defaultFilters, 1);
    }, []);

    const onApplyFilters = useCallback(() => {
        loadIncidents(filters, 1);
    }, [filters, loadIncidents]);

    const onResetFilters = useCallback(() => {
        setFilters(defaultFilters);
        loadIncidents(defaultFilters, 1);
    }, [loadIncidents]);

    const onSyncPayments = useCallback(async () => {
        setIsSyncing(true);

        try {
            const { data } = await $apiPrivate.post<SyncResult>('/mollie/sync/payments');
            setSyncMessage(`Sync payments: создано ${data.created}, обновлено ${data.updated}, пропущено ${data.skipped}, ошибок ${data.errors}`);
            await loadIncidents(filters, 1);
        } finally {
            setIsSyncing(false);
        }
    }, [filters, loadIncidents]);

    const onPreviousPage = useCallback(() => {
        loadIncidents(filters, Math.max(page - 1, 1));
    }, [filters, loadIncidents, page]);

    const onNextPage = useCallback(() => {
        loadIncidents(filters, Math.min(page + 1, totalPages));
    }, [filters, loadIncidents, page, totalPages]);

    const onResolveIncident = useCallback(async (incident: MollieIncident) => {
        if (!window.confirm(`Пометить «${incident.title}» как решённую проблему?`)) {
            return;
        }

        setResolvingIncidentId(incident.id);

        try {
            await $apiPrivate.post(`/mollie/incidents/${incident.id}/resolve`);
            await loadIncidents(filters, page);
        } finally {
            setResolvingIncidentId(undefined);
        }
    }, [filters, loadIncidents, page]);

    const summaryCards = useMemo(
        () => [
            { label: 'Всего проблем', value: totals.total, accent: totals.total ? 'danger' : 'success' },
            { label: 'Платежи', value: totals.payments, accent: totals.payments ? 'danger' : 'neutral' },
            { label: 'Подписки', value: totals.subscriptions, accent: totals.subscriptions ? 'warning' : 'neutral' },
            { label: 'Профили: email/ученик', value: totals.customers, accent: totals.customers ? 'info' : 'neutral' },
        ],
        [totals],
    );

    const pagination = total > 0 ? (
        <div className={s.pagination}>
            <span>{firstItemNumber}-{lastItemNumber}{t(' из ')}{total}</span>
            <div className={s.paginationActions}>
                <Button theme={ButtonTheme.CLEAR} className={s.pageButton} onClick={onPreviousPage} disabled={isLoading || page <= 1}>
                    ←
                </Button>
                <span>{page} / {totalPages}</span>
                <Button theme={ButtonTheme.CLEAR} className={s.pageButton} onClick={onNextPage} disabled={isLoading || page >= totalPages}>
                    →
                </Button>
            </div>
        </div>
    ) : null;

    return (
        <VStack gap="16" max className={s.MollieIncidents}>
            <HStack max justify="between" align="center">
                <div>
                    <Text title="Payment Incidents" size="m" bold />
                    <Text text="Проблемные автосписания, подписки без valid mandate и неполные профили клиентов." size="s" className={s.subtitle} />
                </div>
                <Button
                    theme={ButtonTheme.BACKGROUND_INVERTED}
                    onClick={onSyncPayments}
                    disabled={isSyncing}
                >
                    {isSyncing ? 'Sync...' : 'Sync payments'}
                </Button>
            </HStack>
            {syncMessage && <Text text={syncMessage} size="s" className={s.subtitle} />}

            <HStack gap="16" max wrap="wrap" align="stretch">
                {summaryCards.map((card) => (
                    <Card key={card.label} padding="16" className={`${s.summaryCard} ${s[card.accent]}`}>
                        <Text text={card.label} size="s" />
                        <Text title={String(card.value)} size="m" bold />
                    </Card>
                ))}
            </HStack>

            <div className={s.filters}>
                <Input
                    className={s.filterInput}
                    label="Поиск"
                    placeholder="Ученик, плательщик, email, Mollie ID, подписка"
                    value={filters._q}
                    onChange={(value) => setFilters((prev) => ({ ...prev, _q: value }))}
                    fullWidth
                />
                <Select<IncidentTypeFilter>
                    className={s.filterSelect}
                    label="Тип"
                    value={filters.type}
                    options={typeOptions}
                    onChange={(value) => setFilters((prev) => ({ ...prev, type: value }))}
                />
                <div className={s.filterActions}>
                    <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onApplyFilters} disabled={isLoading}>
                        {t('Применить')}
                    </Button>
                    <Button className={s.resetButton} theme={ButtonTheme.OUTLINE} onClick={onResetFilters} disabled={isLoading}>
                        {t('Сбросить')}
                    </Button>
                </div>
            </div>

            {pagination}

            {error && (
                <Card padding="24" fullWidth className={s.stateCard}>
                    <Text title="Не удалось загрузить проблемы" text="Проверьте сервер или попробуйте синхронизировать Mollie payments." size="m" />
                </Card>
            )}

            {isLoading && !incidents.length && (
                <VStack gap="16" max>
                    <Skeleton width="100%" height={104} border="14px" />
                    <Skeleton width="100%" height={104} border="14px" />
                    <Skeleton width="100%" height={104} border="14px" />
                </VStack>
            )}

            {!isLoading && !error && !incidents.length && (
                <Card padding="24" fullWidth className={s.stateCard}>
                    <Text title="Проблем нет" text="Красота: автосписания и профили выглядят спокойно." size="m" />
                </Card>
            )}

            {!!incidents.length && (
                <VStack gap="16" max>
                    {incidents.map((incident) => (
                        <Card key={incident.id} padding="16" fullWidth className={`${s.incidentCard} ${s[incident.severity]}`}>
                            <div className={s.incidentGrid}>
                                <div className={s.mainInfo}>
                                    <HStack gap="8" align="center">
                                        <span className={`${s.badge} ${s[incident.type]}`}>{incident.type}</span>
                                        <span className={`${s.status} ${s[incident.severity]}`}>{incident.status}</span>
                                    </HStack>
                                    <Text title={incident.title} size="s" bold />
                                    <Text text={incident.description || getIncidentHint(incident)} size="s" className={s.mutedText} />
                                </div>

                                <div className={s.clientInfo}>
                                    <Text text="Плательщик / ученик" size="s" className={s.label} />
                                    {incident.customer?.id ? (
                                        <Link className={s.link} to={`/mollie/customers/${incident.customer.id}`}>
                                            {getCustomerName(incident.customer)}
                                        </Link>
                                    ) : (
                                        <Text text={getCustomerName(incident.customer)} bold />
                                    )}
                                    <Text text={incident.customer?.email || incident.customer?.mollieId || '—'} size="s" className={s.mutedText} />
                                    {getStudentLinks(incident.customer).length ? (
                                        <div className={s.studentLinks}>
                                            {getStudentLinks(incident.customer).map((link) => (
                                                link.client?.id ? (
                                                    <Link className={s.crmLink} to={`/clients/${link.client.id}`} key={link.id}>
                                                        {t('Ученик: {{name}}', { name: [link.client.firstName, link.client.lastName].filter(Boolean).join(' ') || link.client.email || `#${link.client.id}` })}
                                                    </Link>
                                                ) : null
                                            ))}
                                        </div>
                                    ) : (
                                        <Text text={getCrmClientName(incident.customer)} size="s" className={s.mutedText} />
                                    )}
                                </div>

                                <div>
                                    <Text text="Сумма" size="s" className={s.label} />
                                    <Text text={formatAmount(incident)} bold />
                                </div>

                                <div>
                                    <Text text="Дата" size="s" className={s.label} />
                                    <Text text={formatDate(incident.updatedAt || incident.createdAt)} bold />
                                </div>

                                <div className={s.actions}>
                                    <Button
                                        className={s.resolveButton}
                                        theme={ButtonTheme.OUTLINE}
                                        disabled={resolvingIncidentId === incident.id}
                                        onClick={() => onResolveIncident(incident)}
                                    >
                                        {resolvingIncidentId === incident.id ? 'Сохраняем...' : 'Пометить решённым'}
                                    </Button>
                                    {incident.customer?.id && (
                                        <Link className={s.actionLink} to={`/mollie/customers/${incident.customer.id}`}>
                                            {t('Открыть клиента')}
                                        </Link>
                                    )}
                                    {incident.type === 'payment' && (
                                        <Link className={s.actionLink} to="/mollie/payments">
                                            {t('Все платежи')}
                                        </Link>
                                    )}
                                    {getStudentLinks(incident.customer)[0]?.client?.id && (
                                        <Link className={s.actionLink} to={`/clients/${getStudentLinks(incident.customer)[0].client?.id}`}>
                                            {t('Открыть ученика')}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </VStack>
            )}

            {pagination}
        </VStack>
    );
});
