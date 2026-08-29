import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import cls from './MollieClientForm.module.scss';
import { memo, useCallback } from 'react';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { toast } from 'react-toastify';
import { MollieClientCard } from '@/entities/MollieClient';
import { ClientLanguage } from '@/entities/Client';
import { mollieClientActions } from '../../model/slices/mollieClientSlice';
import {
    getMollieClienIsLoading,
    getMollieClientForm,
} from '../../model/selectors/getMollieClientForm';
import { updateMollieClientData } from '../../model/services/updateMollieClientData/updateMollieClientData';
import { Skeleton } from '@/shared/ui/Skeleton';

interface MollieClientFormProps {
    className?: string;
    onSuccess: () => void;
    reloadPage?: () => void;
    clientId?: string;
}

const MollieClientForm = memo((props: MollieClientFormProps) => {
    const { className, onSuccess, reloadPage, clientId } = props;

    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const formData = useSelector(getMollieClientForm);
    const isLoading = useSelector(getMollieClienIsLoading);

    const cleanForm = useCallback(() => {
        onChangeFirstName('');
        onChangeLastName('');
        onChangeEmail('');
    }, [onSuccess]);

    const onChangeConsumerAccount = useCallback(
        (value?: string) => {
            dispatch(mollieClientActions.updateProfile({ consumerAccount: value }));
        },
        [dispatch]
    );
    const onChangeConsumerName = useCallback(
        (value?: string) => {
            dispatch(mollieClientActions.updateProfile({ consumerName: value }));
        },
        [dispatch]
    );
    const onChangeConsumerBic = useCallback(
        (value?: string) => {
            dispatch(mollieClientActions.updateProfile({ consumerBic: value }));
        },
        [dispatch]
    );
    const onChangeFirstName = useCallback(
        (value?: string) => {
            dispatch(mollieClientActions.updateProfile({ givenName: value }));
        },
        [dispatch]
    );
    const onChangeLastName = useCallback(
        (value?: string) => {
            dispatch(mollieClientActions.updateProfile({ familyName: value }));
        },
        [dispatch]
    );
    const onChangeEmail = useCallback(
        (value?: string) => {
            dispatch(mollieClientActions.updateProfile({ email: value }));
        },
        [dispatch]
    );
    const onChangeCity = useCallback(
        (value?: string) => {
            dispatch(mollieClientActions.updateProfile({ city: value }));
        },
        [dispatch]
    );
    const onChangePreferredLanguage = useCallback(
        (value?: ClientLanguage) => {
            dispatch(mollieClientActions.updateProfile({ preferredLanguage: value }));
        },
        [dispatch]
    );

    const onSave = useCallback(async () => {
        const result = await dispatch(updateMollieClientData());
        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess();
            reloadPage?.();
            cleanForm();
            toast.success(t('Клиент успешно обновлен'));
        }
    }, [onSuccess, cleanForm, dispatch, reloadPage]);

    if (isLoading) {
        return (
            <div className={classNames(cls.MollieClientForm, {}, [className])}>
                <VStack gap="24" align="center" className={cls.header}>
                    <Skeleton width={260} height={24} border="6px" />
                    <Skeleton width="100%" height={72} border="14px" />
                    <Skeleton width="100%" height={72} border="14px" />
                    <Skeleton width="100%" height={72} border="14px" />
                    <Skeleton width="100%" height={72} border="14px" />
                    <Skeleton width="100%" height={72} border="14px" />
                    <Skeleton width="100%" height={72} border="14px" />
                    <Skeleton width="100%" height={72} border="14px" />
                    <Skeleton width="100%" height={72} border="14px" />
                    <Skeleton width="100%" height={44} border="32px" />
                </VStack>
            </div>
        );
    }

    return (
        <div className={classNames(cls.MollieClientForm, {}, [className])}>
            <VStack gap="24" align="center" className={cls.header}>
                <Text size="m" title={clientId ? t('Редактирование клиента') : t('Добавление нового клиента')} bold />
                <MollieClientCard
                    onChangeLastName={onChangeLastName}
                    onChangeFirstName={onChangeFirstName}
                    onChangeEmail={onChangeEmail}
                    onChangeCity={onChangeCity}
                    onChangeConsumerAccount={onChangeConsumerAccount}
                    onChangeConsumerName={onChangeConsumerName}
                    onChangeConsumerBic={onChangeConsumerBic}
                    onChangePreferredLanguage={onChangePreferredLanguage}
                    data={formData}
                />
                <Button fullWidth onClick={onSave} theme={ButtonTheme.BACKGROUND_INVERTED}>
                    {t('Сохранить')}
                </Button>
            </VStack>
        </div>
    );
});

export default MollieClientForm;
