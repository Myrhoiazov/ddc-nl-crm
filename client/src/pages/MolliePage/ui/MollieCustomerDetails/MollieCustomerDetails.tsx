import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { MollieClientDetails } from '@/entities/MollieClient';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import { MandateList } from '@/entities/Mandate';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { mollieClientsPageSliceReducer } from '../../model/slices/mollieClientsDetailsPageSlice';
import { MollieSubscriptionList } from '@/entities/MollieSubscription';
import { EditSubscriptionDropdown } from '@/features/editSubscriptionDropdown';
import s from './MollieCustomerDetails.module.scss';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { MollieClientFormModal, mollieClientReducer } from '@/features/editMollieClientDropdown';
import { useMollieCustomerDetails } from './useMollieCustomerDetails';
import { MollieStudentLinksManager } from './MollieStudentLinksManager';
import { MolliePaymentHistory } from './MolliePaymentHistory';

interface MollieCustomerDetailsProps {
    className?: string;
}

const reducers: ReducersList = {
    customerDetailsMandates: mollieClientsPageSliceReducer,
    mollieClientForm: mollieClientReducer,
};

export const MollieCustomerDetails = memo(({ className }: MollieCustomerDetailsProps) => {
    const { t } = useTranslation();
    const { id: customerId } = useParams();
    const {
        mandates,
        subscriptions,
        isLoading,
        isEditModalOpen,
        detailsVersion,
        onOpenEditModal,
        onCloseEditModal,
        onReloadCustomerDetails,
        onRevokeMandate,
    } = useMollieCustomerDetails(customerId);

    if (!customerId) {
        return null;
    }

    return (
        <DynamicModuleLoader reducers={reducers}>
            <VStack max gap="24" className={classNames(s.MollieCustomerDetails, {}, [className])}>
                <div className={s.header}>
                    <Text title={t('Mollie Details Customer')} size="m" bold />
                    <Button
                        className={s.editButton}
                        theme={ButtonTheme.BACKGROUND_INVERTED}
                        onClick={onOpenEditModal}
                    >
                        {t('Редактировать')}
                    </Button>
                </div>
                <MollieClientDetails id={customerId} key={`${customerId}-${detailsVersion}`} />
                <MollieStudentLinksManager
                    customerId={customerId}
                    version={detailsVersion}
                    onChanged={onReloadCustomerDetails}
                />
                <MandateList
                    mandates={mandates}
                    isLoading={isLoading}
                    renderAction={(mandate) => mandate.status === 'valid' ? (
                        <Button theme={ButtonTheme.OUTLINE_RED} onClick={() => onRevokeMandate(mandate)}>
                            {t('Отозвать')}
                        </Button>
                    ) : null}
                />
                <MollieSubscriptionList
                    subscriptions={subscriptions}
                    isLoading={isLoading}
                    renderAction={(subscription) => (
                        <EditSubscriptionDropdown
                            customerId={customerId}
                            subscription={subscription}
                            mandates={mandates}
                            reloadPage={onReloadCustomerDetails}
                        />
                    )}
                />
                <MolliePaymentHistory customerId={customerId} key={`history-${customerId}-${detailsVersion}`} />
                <MollieClientFormModal
                    clientId={customerId}
                    isOpen={isEditModalOpen}
                    onClose={onCloseEditModal}
                    reloadPage={onReloadCustomerDetails}
                />
            </VStack>
        </DynamicModuleLoader>
    );
});
