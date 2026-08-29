import React, { memo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './TransactionsPage.module.scss';
import { Page } from '@/widgets/Page/Page';
import { Text } from '@/shared/ui/Text/Text';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import { fetchTransactionsList } from '../../model/services/fetchTransactionsList/fetchTransactionsList';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { transactionsPageReducer } from '../../model/slices/transactionsPageSlice';
import { VStack } from '@/shared/ui/Stack';

import { useSelector } from 'react-redux';
import {
    getTransactionPageData,
    getTransactionPageIsLoading,
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
    const dispatch = useAppDispatch();
    const transactions = useSelector(getTransactionPageData);
    const summary = useSelector(getTransactionPageSummaryData);
    const isLoading = useSelector(getTransactionPageIsLoading);
    const [searchParams] = useSearchParams();

    useInitialEffect(() => {
        dispatch(initTransactionsPage(searchParams));
    });

    const fetchAllTransactions = useCallback(() => {
        dispatch(fetchTransactionsList({ replace: true, noQuery: true }));
        dispatch(fetchTransactionsSummary());
    }, [dispatch]);

    return (
        <DynamicModuleLoader reducers={reducers}>
            <Page className={classNames(s.TransactionsPage, {}, [className])}>
                <VStack max gap="16">
                    <SummaryCards summary={summary} isLoading={isLoading} />
                    <FiltersContainer reloadPage={fetchAllTransactions} />
                    <VStack gap="16" max>
                        <Text title="Финансовый Учет" bold />
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
                    </VStack>
                </VStack>
            </Page>
        </DynamicModuleLoader>
    );
};

export default memo(TransactionsPage);
