import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import { memo, useCallback } from 'react';
import {
    addTransactionFormActions,
    addTransactionFormReducer,
} from '../../model/slices/addTransactionFormSlice';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { TransactionCard } from '@/entities/Transaction';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useSelector } from 'react-redux';
import { getTransactionFormData } from '../../model/selectors/getTransactionFormData';
import { TransactionType } from '@/entities/TransactionType';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { createTransaction } from '../../model/services/createTransaction/createTransaction';
import { PaymentMethod } from '@/entities/PaymentMethod';
import { TransactionCategory } from '@/entities/TransactionCategory';

interface AddTransactionFormProps {
    className?: string;
    onSuccess: () => void;
    reloadPage?: () => void;
}

const initialReducers: ReducersList = {
    addTransactionForm: addTransactionFormReducer,
};

const AddTransactionForm = memo((props: AddTransactionFormProps) => {
    const { className, onSuccess, reloadPage } = props;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const formData = useSelector(getTransactionFormData);

    const onChangeTransactionType = useCallback(
        (type: TransactionType) => {
            dispatch(
                addTransactionFormActions.updateForm({ type: type || TransactionType.INCOME })
            );
        },
        [dispatch]
    );
    const onChangeTransactionCategory = useCallback(
        (category: TransactionCategory) => {
            dispatch(addTransactionFormActions.updateForm({ category }));
        },
        [dispatch]
    );
    const onChangePaymentMethod = useCallback(
        (type: PaymentMethod) => {
            dispatch(
                addTransactionFormActions.updateForm({
                    paymentMethod: type || PaymentMethod.CASH,
                })
            );
        },
        [dispatch]
    );
    const onChangeSum = useCallback(
        (value?: string) => {
            dispatch(addTransactionFormActions.updateForm({ amount: value ?? '0' }));
        },
        [dispatch]
    );
    const onChangeDescription = useCallback(
        (value?: string) => {
            dispatch(addTransactionFormActions.updateForm({ description: value ?? '' }));
        },
        [dispatch]
    );
    const onChangeDate = useCallback(
        (value?: string) => {
            dispatch(addTransactionFormActions.updateForm({ date: value ?? '' }));
        },
        [dispatch]
    );

    const onSave = useCallback(async () => {
        const result = await dispatch(createTransaction());
        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess();
            reloadPage?.();
        }
    }, [onSuccess, dispatch, reloadPage]);

    return (
        <DynamicModuleLoader reducers={initialReducers}>
            <div className={classNames('', {}, [className])}>
                <VStack gap="24" align="center">
                    <Text size="m" title={t('Добавление прихода - расхода')} bold />
                    <TransactionCard
                        data={formData}
                        onChangeTransactionType={onChangeTransactionType}
                        onChangeSum={onChangeSum}
                        onChangeDescription={onChangeDescription}
                        onChangeDate={onChangeDate}
                        onChangePaymentMethod={onChangePaymentMethod}
                        onChangeTransactionCategory={onChangeTransactionCategory}
                    />
                    <Button fullWidth onClick={onSave} theme={ButtonTheme.BACKGROUND_INVERTED}>
                        {t('Добавить')}
                    </Button>
                </VStack>
            </div>
        </DynamicModuleLoader>
    );
});

export default AddTransactionForm;
