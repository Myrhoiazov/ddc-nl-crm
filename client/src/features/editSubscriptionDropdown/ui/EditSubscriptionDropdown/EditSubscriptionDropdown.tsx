import { classNames } from '@/shared/lib/classNames/classNames';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '@/shared/ui/Popups';
import { Icon } from '@/shared/ui/Icon/Icon';
import Edit from '@/shared/assets/icons/edit-icon.svg';
import { MollieSubscription } from '@/entities/MollieSubscription';
import { Mandate } from '@/entities/Mandate';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { useEditSubscriptionDropdown } from './useEditSubscriptionDropdown';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';
import { EditSubscriptionModal } from './EditSubscriptionModal';
import { RestartSubscriptionModal } from './RestartSubscriptionModal';
import s from './EditSubscriptionDropdown.module.scss';

interface EditSubscriptionDropdownProps {
    className?: string;
    customerId: string;
    subscription: MollieSubscription;
    mandates: Mandate[];
    reloadPage?: () => void;
}

export const EditSubscriptionDropdown = memo((props: EditSubscriptionDropdownProps) => {
    const { className, customerId, subscription, mandates, reloadPage } = props;
    const { t } = useTranslation();
    const {
        modal,
        isSaving,
        validMandateOptions,
        form,
        setForm,
        restartDate,
        setRestartDate,
        closeModal,
        setModal,
        items,
        today,
        onCancel,
        onUpdate,
        onRestart,
    } = useEditSubscriptionDropdown(customerId, subscription, mandates, reloadPage);

    return (
        <>
            <div className={classNames(s.rowActions, {}, [className])}>
                {subscription.status === 'active' && (
                    <Button
                        theme={ButtonTheme.OUTLINE_RED}
                        className={s.stopButton}
                        onClick={() => setModal('cancel')}
                    >
                        {t('Остановить')}
                    </Button>
                )}
                <Dropdown
                    direction="bottom left"
                    items={items}
                    trigger={<Icon Svg={Edit} width={24} height={24} color="stroke" />}
                    triggerAriaLabel="Действия подписки"
                />
            </div>
            <CancelSubscriptionModal isOpen={modal === 'cancel'} isSaving={isSaving} onClose={closeModal} onCancel={onCancel} />
            <EditSubscriptionModal
                isOpen={modal === 'edit'}
                isSaving={isSaving}
                form={form}
                setForm={setForm}
                validMandateOptions={validMandateOptions}
                today={today}
                onClose={closeModal}
                onUpdate={onUpdate}
            />
            <RestartSubscriptionModal
                isOpen={modal === 'restart'}
                isSaving={isSaving}
                mandateId={form.mandateId}
                onMandateChange={(mandateId) => setForm((prev) => ({ ...prev, mandateId }))}
                validMandateOptions={validMandateOptions}
                restartDate={restartDate}
                setRestartDate={setRestartDate}
                today={today}
                onClose={closeModal}
                onRestart={onRestart}
            />
        </>
    );
});
