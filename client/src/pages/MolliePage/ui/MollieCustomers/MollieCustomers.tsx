import { useSelector } from 'react-redux';
import React, { memo, useCallback, useState } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { fetchMollieClientsList } from '../../model/services/fetchMollieClientsList/fetchMollieClientsList';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import {
    getMollieClients,
    mollieClientsPageSliceReducer,
} from '../../model/slices/mollieClientsDetailsPageSlice';
import {
    getMollieClientsPageError,
    getMollieClientsPageIsLoading,
    getMollieClientsPageLimit,
    getMollieClientsPagePage,
    getMollieClientsPageTotal,
    getMollieClientsPageTotalPages,
} from '../../model/selectors/mollieClientsPageSelectors';
import { MollieClient, MollieClientList } from '@/entities/MollieClient';
import { EditMollieClientDropdown } from '@/features/editMollieClientDropdown';
import { HStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { MollieClientAction } from '@/widgets/MollieClientAction';
import { Input } from '@/shared/ui/Input/Input';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { $apiPrivate } from '@/shared/api/api';
import s from './MollieCustomers.module.scss';

interface MollieCustomersProps {
    className?: string;
}

type YesNoAllFilter = 'all' | 'yes' | 'no';
type SubscriptionStatusFilter = 'all' | 'active' | 'not_active';

interface MollieCustomersFilters {
    _q: string;
    hasSubscriptions: YesNoAllFilter;
    hasMandates: YesNoAllFilter;
    subscriptionStatus: SubscriptionStatusFilter;
}

const defaultFilters: MollieCustomersFilters = {
    _q: '',
    hasSubscriptions: 'all',
    hasMandates: 'all',
    subscriptionStatus: 'all',
};

const PAGE_SIZE = 15;

const yesNoOptions: SelectOption<YesNoAllFilter>[] = [
    { value: 'all', content: 'Все' },
    { value: 'yes', content: 'Есть' },
    { value: 'no', content: 'Нет' },
];

const subscriptionStatusOptions: SelectOption<SubscriptionStatusFilter>[] = [
    { value: 'all', content: 'Все клиенты' },
    { value: 'active', content: 'С активной подпиской' },
    { value: 'not_active', content: 'Без активной подписки' },
];

const reducers: ReducersList = {
    mollieClientsPage: mollieClientsPageSliceReducer,
};

export const MollieCustomers = memo(({ className }: MollieCustomersProps) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const mollieClients = useSelector(getMollieClients.selectAll);
    const isLoading = useSelector(getMollieClientsPageIsLoading);
    const error = useSelector(getMollieClientsPageError);
    const page = useSelector(getMollieClientsPagePage);
    const limit = useSelector(getMollieClientsPageLimit);
    const total = useSelector(getMollieClientsPageTotal);
    const totalPages = useSelector(getMollieClientsPageTotalPages);
    const [filters, setFilters] = useState<MollieCustomersFilters>(defaultFilters);
    const firstItemNumber = total ? (page - 1) * limit + 1 : 0;
    const lastItemNumber = Math.min(page * limit, total);

    useInitialEffect(() => {
        dispatch(fetchMollieClientsList({
            replace: true,
            page: 1,
            limit: PAGE_SIZE,
            ...defaultFilters,
        }));
    });

    const fetchAllClients = useCallback((nextFilters = filters, nextPage = page) => {
        dispatch(fetchMollieClientsList({
            replace: true,
            page: nextPage,
            limit: PAGE_SIZE,
            ...nextFilters,
        }));
    }, [dispatch, filters, page]);

    const onChangeSearch = useCallback((value: string) => {
        setFilters((prev) => ({ ...prev, _q: value }));
    }, []);

    const onChangeSubscriptionStatus = useCallback((value: SubscriptionStatusFilter) => {
        setFilters((prev) => ({ ...prev, subscriptionStatus: value }));
    }, []);

    const onChangeHasSubscriptions = useCallback((value: YesNoAllFilter) => {
        setFilters((prev) => ({ ...prev, hasSubscriptions: value }));
    }, []);

    const onChangeHasMandates = useCallback((value: YesNoAllFilter) => {
        setFilters((prev) => ({ ...prev, hasMandates: value }));
    }, []);

    const onApplyFilters = useCallback(() => {
        fetchAllClients(filters, 1);
    }, [fetchAllClients, filters]);

    const onResetFilters = useCallback(() => {
        setFilters(defaultFilters);
        fetchAllClients(defaultFilters, 1);
    }, [fetchAllClients]);

    const onPreviousPage = useCallback(() => {
        fetchAllClients(filters, Math.max(page - 1, 1));
    }, [fetchAllClients, filters, page]);

    const onNextPage = useCallback(() => {
        fetchAllClients(filters, Math.min(page + 1, totalPages));
    }, [fetchAllClients, filters, page, totalPages]);

    const onExportActiveSubscriptions = useCallback(async () => {
        const response = await $apiPrivate.get('/mollie/customers/active-subscriptions/export.csv', {
            params: {
                _q: filters._q.trim() || undefined,
            },
            responseType: 'blob',
        });
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'active-subscriptions.csv';
        link.click();
        URL.revokeObjectURL(url);
    }, [filters._q]);

    const pagination = !error && total > 0 ? (
        <div className={s.pagination}>
            <span className={s.paginationMeta}>
                {firstItemNumber}-{lastItemNumber}{t(' из ')}{total}
            </span>
            <div className={s.paginationActions}>
                <Button
                    className={s.pageButton}
                    theme={ButtonTheme.CLEAR}
                    onClick={onPreviousPage}
                    disabled={isLoading || page <= 1}
                >
                    ←
                </Button>
                <span className={s.pageMeta}>{page} / {totalPages}</span>
                <Button
                    className={s.pageButton}
                    theme={ButtonTheme.CLEAR}
                    onClick={onNextPage}
                    disabled={isLoading || page >= totalPages}
                >
                    →
                </Button>
            </div>
        </div>
    ) : null;

    return (
        <DynamicModuleLoader reducers={reducers}>
            <div className={classNames(s.MollieCustomers, {}, [className])}>
                <HStack justify="between" align="center" max>
                    <Text title={t('Mollie Customers')} bold />
                    <HStack gap="8" wrap="wrap">
                        <Button theme={ButtonTheme.OUTLINE} onClick={onExportActiveSubscriptions}>
                            {t('CSV активные подписки')}
                        </Button>
                        <MollieClientAction reloadPage={fetchAllClients} />
                    </HStack>
                </HStack>
                <div className={s.filters}>
                    <Input
                        className={s.filterInput}
                        label="Поиск"
                        placeholder="Имя, email или Mollie ID"
                        value={filters._q}
                        onChange={onChangeSearch}
                        fullWidth
                    />
                    <Select<SubscriptionStatusFilter>
                        className={s.filterSelect}
                        label="Активность"
                        value={filters.subscriptionStatus}
                        options={subscriptionStatusOptions}
                        onChange={onChangeSubscriptionStatus}
                    />
                    <Select<YesNoAllFilter>
                        className={s.filterSelect}
                        label="Подписки"
                        value={filters.hasSubscriptions}
                        options={yesNoOptions}
                        onChange={onChangeHasSubscriptions}
                    />
                    <Select<YesNoAllFilter>
                        className={s.filterSelect}
                        label="Мандаты"
                        value={filters.hasMandates}
                        options={yesNoOptions}
                        onChange={onChangeHasMandates}
                    />
                    <div className={s.filterActions}>
                        <Button
                            className={s.applyButton}
                            theme={ButtonTheme.BACKGROUND_INVERTED}
                            onClick={onApplyFilters}
                            disabled={isLoading}
                        >
                            {t('Применить')}
                        </Button>
                        <Button
                            className={s.resetButton}
                            theme={ButtonTheme.OUTLINE}
                            onClick={onResetFilters}
                            disabled={isLoading}
                        >
                            {t('Сбросить')}
                        </Button>
                    </div>
                </div>
                {pagination}
                <MollieClientList
                    isLoading={isLoading}
                    error={error}
                    clients={mollieClients}
                    renderAction={(client: MollieClient) => (
                        <EditMollieClientDropdown
                            clientId={client.id ?? ''}
                            reloadPage={fetchAllClients}
                        />
                    )}
                />
                {pagination}
            </div>
        </DynamicModuleLoader>
    );
});
