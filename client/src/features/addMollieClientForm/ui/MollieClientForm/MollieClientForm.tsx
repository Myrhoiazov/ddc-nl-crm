import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import cls from './MollieClientForm.module.scss';
import { memo, useCallback } from 'react';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import {
    addMollieClientActions,
    addMollieClientReducer,
} from '../../model/slices/addMollieClientSlice';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { addMolieClientData } from '../../model/services/addMolieClientData/addMolieClientData';
import { toast } from 'react-toastify';
import { MollieClientCard } from '@/entities/MollieClient';
import { getAddClientForm } from '../../model/selectors/getAddClientForm/getAddClientForm';

interface MollieClientFormProps {
    className?: string;
    onSuccess: () => void;
    reloadPage?: () => void;
}

const initialReducers: ReducersList = {
    addMollieClientForm: addMollieClientReducer,
};

const MollieClientForm = memo((props: MollieClientFormProps) => {
    const { className, onSuccess, reloadPage } = props;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const formData = useSelector(getAddClientForm);

    const cleanForm = useCallback(() => {
        onChangeEmail('');
    }, [onSuccess]);

    const onChangeConsumerAccount = useCallback(
        (value?: string) => {
            dispatch(addMollieClientActions.updateProfile({ consumerAccount: value }));
        },
        [dispatch]
    );
    const onChangeConsumerName = useCallback(
        (value?: string) => {
            dispatch(addMollieClientActions.updateProfile({ consumerName: value }));
        },
        [dispatch]
    );
    const onChangeConsumerBic = useCallback(
        (value?: string) => {
            dispatch(addMollieClientActions.updateProfile({ consumerBic: value }));
        },
        [dispatch]
    );
    const onChangeFirstName = useCallback(
        (value?: string) => {
            dispatch(addMollieClientActions.updateProfile({ givenName: value }));
        },
        [dispatch]
    );
    const onChangeLastName = useCallback(
        (value?: string) => {
            dispatch(addMollieClientActions.updateProfile({ familyName: value }));
        },
        [dispatch]
    );
    const onChangeEmail = useCallback(
        (value?: string) => {
            dispatch(addMollieClientActions.updateProfile({ email: value }));
        },
        [dispatch]
    );
    const onChangeCity = useCallback(
        (value?: string) => {
            dispatch(addMollieClientActions.updateProfile({ city: value }));
        },
        [dispatch]
    );

    const onSave = useCallback(async () => {
        const result = await dispatch(addMolieClientData());
        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess();
            reloadPage?.();
            cleanForm();
            toast.success(t('Клиент успешно добавлен'));
        }
    }, [onSuccess, cleanForm, dispatch, reloadPage]);

    return (
        <DynamicModuleLoader reducers={initialReducers}>
            <div className={classNames(cls.MollieClientForm, {}, [className])}>
                <VStack gap="24" align="center" className={cls.header}>
                    <Text size="m" title={t('Добавление нового клиента')} bold />
                    <MollieClientCard
                        onChangeLastName={onChangeLastName}
                        onChangeFirstName={onChangeFirstName}
                        onChangeEmail={onChangeEmail}
                        onChangeCity={onChangeCity}
                        onChangeConsumerAccount={onChangeConsumerAccount}
                        onChangeConsumerName={onChangeConsumerName}
                        onChangeConsumerBic={onChangeConsumerBic}
                        data={formData}
                    />
                    <Button fullWidth onClick={onSave} theme={ButtonTheme.BACKGROUND_INVERTED}>
                        {t('Добавить')}
                    </Button>
                </VStack>
            </div>
        </DynamicModuleLoader>
    );
});

export default MollieClientForm;
