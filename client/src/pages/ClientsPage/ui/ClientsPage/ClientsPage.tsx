import { classNames } from '@/shared/lib/classNames/classNames';
import { memo, useCallback, useEffect, useMemo } from 'react';
import cls from './ClientsPage.module.scss';
import { Client, ClientList, ClientView, ClientViewSelector } from '@/entities/Client';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import {
    clientsPageActions,
    clientsPageReducer,
    getClients,
} from '../../model/slices/clientsPageSlice';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useSelector } from 'react-redux';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import {
    getClientsPageIsLoading,
    getClientsPageView,
} from '../../model/selectors/clientsPageSelectors';
import { fetchNextClientsPage } from '../../model/services/fetchNextClientsPage/fetchNextClientsPage';
import { initClientsPage } from '../../model/services/initClientsPage/initClientsPage';
import { FiltersContainer } from '../FiltersContainer/FiltersContainer';
import { fetchClientsList } from '../../model/services/fetchClientsList/fetchClientsList';
import { EditClientDropdown } from '@/features/editClientDropdown';
import { Text } from '@/shared/ui/Text/Text';
import { HStack } from '@/shared/ui/Stack';
import { Page } from '@/widgets/Page/Page';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CLIENT_CREATED_EVENT } from '@/shared/const/events';

interface ClientsPageProps {
    className?: string;
}

const reducers: ReducersList = {
    clientsPage: clientsPageReducer,
};

const ClientsPage = (props: ClientsPageProps) => {
    const { className } = props;
    const dispatch = useAppDispatch();
    const clients = useSelector(getClients.selectAll);
    const isLoading = useSelector(getClientsPageIsLoading);
    const view = useSelector(getClientsPageView);
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();

    const onChangeView = useCallback(
        (view: ClientView) => {
            dispatch(clientsPageActions.setView(view));
        },
        [dispatch]
    );

    const onLoadNextPart = useCallback(() => {
        dispatch(fetchNextClientsPage());
    }, [dispatch]);

    useInitialEffect(() => {
        dispatch(initClientsPage(searchParams));
    });

    const fetchAllClients = useCallback(() => {
        dispatch(fetchClientsList({ replace: true, noQuery: true }));
    }, [dispatch]);

    const stats = useMemo(() => {
        const linked = clients.filter((client) => Boolean(client.mollieLinks?.length)).length;
        const branches = new Set(clients.map((client) => client.branch?.name).filter(Boolean));
        return {
            total: clients.length,
            linked,
            unlinked: clients.length - linked,
            branches: branches.size,
        };
    }, [clients]);

    // A client can also be created from the global "Добавить клиента" button in Navbar,
    // which lives outside this page — it signals us via a DOM event instead of a prop.
    useEffect(() => {
        window.addEventListener(CLIENT_CREATED_EVENT, fetchAllClients);
        return () => window.removeEventListener(CLIENT_CREATED_EVENT, fetchAllClients);
    }, [fetchAllClients]);

    return (
        <DynamicModuleLoader reducers={reducers} removeAfterUnmount={false}>
            <Page
                onScrollEnd={onLoadNextPart}
                className={classNames(cls.ClientsPage, {}, [className])}
            >
                <HStack gap="16" align="center">
                    <Text title={t('ClientsList')} size="l" bold />
                    <ClientViewSelector view={view} onViewClick={onChangeView} />
                </HStack>
                <div className={cls.statsGrid}>
                    <div className={cls.statCard}><span>{t('Всего учеников')}</span><strong>{stats.total}</strong></div>
                    <div className={cls.statCard}><span>{t('С оплатой')}</span><strong>{stats.linked}</strong></div>
                    <div className={cls.statCard}><span>{t('Без оплаты')}</span><strong>{stats.unlinked}</strong></div>
                    <div className={cls.statCard}><span>{t('Филиалов')}</span><strong>{stats.branches}</strong></div>
                </div>
                <FiltersContainer reloadPage={fetchAllClients} />
                <ClientList
                    view={view}
                    isLoading={isLoading}
                    clients={clients}
                    renderAction={(client: Client) => (
                        <EditClientDropdown
                            clientId={client.id ?? ''}
                            mollieCustomerId={client.mollieLinks?.[0]?.customerId}
                            reloadPage={fetchAllClients}
                        />
                    )}
                />
            </Page>
        </DynamicModuleLoader>
    );
};

export default memo(ClientsPage);
