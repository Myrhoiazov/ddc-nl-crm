import React, { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './TransactionsPage.module.scss';
import { Page } from '@/widgets/Page/Page';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import { fetchTransactionsList } from '../../model/services/fetchTransactionsList/fetchTransactionsList';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { transactionsPageActions, transactionsPageReducer } from '../../model/slices/transactionsPageSlice';
import { VStack } from '@/shared/ui/Stack';

import { useSelector } from 'react-redux';
import {
    getTransactionPageData,
    getTransactionPageIsLoading,
    getTransactionPagePage,
    getTransactionPageTotal,
    getTransactionPageTotalPages,
} from '../../model/selectors/transactionPageSelectors';
import { Transaction, TransactionList } from '@/entities/Transaction';
import { FiltersContainer } from '../FiltersContainer/FiltersContainer';
import { initTransactionsPage } from '../../model/services/initTransactionsPage/initTransactionsPage';
import { getTransactionPageSummaryData } from '../../model/selectors/getTransactionPageSummary';
import { SummaryCards } from '@/entities/Summary';
import { fetchTransactionsSummary } from '@/pages/TransactionsPage/model/services/fetchTransactionsSummary/fetchTransactionsSummary';
import { EditTransactionDropdown } from '@/features/editTransactionDropdown';

interface TransactionsPageProps {
    className?: string;
}

const reducers: ReducersList = {
    transactionPage: transactionsPageReducer,
};

const TransactionsPage = ({ className }: TransactionsPageProps) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const transactions = useSelector(getTransactionPageData);
    const summary = useSelector(getTransactionPageSummaryData);
    const isLoading = useSelector(getTransactionPageIsLoading);
    const page = useSelector(getTransactionPagePage);
    const total = useSelector(getTransactionPageTotal);
    const totalPages = useSelector(getTransactionPageTotalPages);
    const [searchParams] = useSearchParams();

    useInitialEffect(() => {
        dispatch(initTransactionsPage(searchParams));
    });

    const fetchAllTransactions = useCallback(() => {
        dispatch(fetchTransactionsList({ replace: true, noQuery: true }));
        dispatch(fetchTransactionsSummary());
    }, [dispatch]);

    const onPreviousPage = useCallback(() => {
        dispatch(transactionsPageActions.setPage(Math.max(page - 1, 1)));
        dispatch(fetchTransactionsList({ replace: true }));
    }, [dispatch, page]);

    const onNextPage = useCallback(() => {
        dispatch(transactionsPageActions.setPage(Math.min(page + 1, totalPages)));
        dispatch(fetchTransactionsList({ replace: true }));
    }, [dispatch, page, totalPages]);

    const pagination = total > 0 ? (
        <div className={s.pagination}>
            <span>{page} / {totalPages}</span>
            <div className={s.paginationActions}>
                <Button theme={ButtonTheme.CLEAR} className={s.pageButton} onClick={onPreviousPage} disabled={isLoading || page <= 1}>
                    ←
                </Button>
                <Button theme={ButtonTheme.CLEAR} className={s.pageButton} onClick={onNextPage} disabled={isLoading || page >= totalPages}>
                    →
                </Button>
            </div>
        </div>
    ) : null;

    return (
        <DynamicModuleLoader reducers={reducers}>
            <Page className={classNames(s.TransactionsPage, {}, [className])}>
                <VStack max gap="16">
                    <SummaryCards summary={summary} isLoading={isLoading} />
                    <FiltersContainer reloadPage={fetchAllTransactions} />
                    <VStack gap="16" max>
                        <Text title={t('Финансовый Учет')} bold />
                        {pagination}
                        <TransactionList
                            isLoading={isLoading}
                            transactions={transactions}
                            renderAction={(transaction: Transaction) => (
                                transaction.source !== 'MOLLIE' ? (
                                    <EditTransactionDropdown
                                        transactionId={transaction.id ?? ''}
                                        reloadPage={fetchAllTransactions}
                                    />
                                ) : null
                            )}
                        />
                        {pagination}
                    </VStack>
                </VStack>
            </Page>
        </DynamicModuleLoader>
    );
};

export default memo(TransactionsPage);
