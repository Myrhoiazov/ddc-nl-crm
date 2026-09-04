import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import cls from './MollieClientForm.module.scss';
import { memo, useCallback, useMemo } from 'react';
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

type ProfileField = 'consumerAccount' | 'consumerName' | 'consumerBic' | 'givenName' | 'familyName' | 'email' | 'city';

const MollieClientForm = memo((props: MollieClientFormProps) => {
    const { className, onSuccess, reloadPage } = props;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const formData = useSelector(getAddClientForm);

    // One stable updater per profile field instead of seven near-identical
    // useCallback blocks; each closure only writes its own slice field.
    const profileUpdaters = useMemo(() => {
        const updater = (field: ProfileField) => (value?: string) => {
            dispatch(addMollieClientActions.updateProfile({ [field]: value }));
        };

        return {
            consumerAccount: updater('consumerAccount'),
            consumerName: updater('consumerName'),
            consumerBic: updater('consumerBic'),
            givenName: updater('givenName'),
            familyName: updater('familyName'),
            email: updater('email'),
            city: updater('city'),
        };
    }, [dispatch]);

    const { email: clearEmail } = profileUpdaters;

    const onSave = useCallback(async () => {
        const result = await dispatch(addMolieClientData());
        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess();
            reloadPage?.();
            clearEmail('');
            toast.success(t('Клиент успешно добавлен'));
        }
    }, [onSuccess, clearEmail, dispatch, reloadPage, t]);

    return (
        <DynamicModuleLoader reducers={initialReducers}>
            <div className={classNames(cls.MollieClientForm, {}, [className])}>
                <VStack gap="24" align="center" className={cls.header}>
                    <Text size="m" title={t('Добавление нового клиента')} bold />
                    <MollieClientCard
                        onChangeLastName={profileUpdaters.familyName}
                        onChangeFirstName={profileUpdaters.givenName}
                        onChangeEmail={profileUpdaters.email}
                        onChangeCity={profileUpdaters.city}
                        onChangeConsumerAccount={profileUpdaters.consumerAccount}
                        onChangeConsumerName={profileUpdaters.consumerName}
                        onChangeConsumerBic={profileUpdaters.consumerBic}
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
