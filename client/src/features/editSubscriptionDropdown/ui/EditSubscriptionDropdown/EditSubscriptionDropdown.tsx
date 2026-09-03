import { classNames } from '@/shared/lib/classNames/classNames';
import { memo } from 'react';
import { Dropdown } from '@/shared/ui/Popups';
import { Icon } from '@/shared/ui/Icon/Icon';
import Edit from '@/shared/assets/icons/edit-icon.svg';
import { MollieSubscription } from '@/entities/MollieSubscription';
import { Mandate } from '@/entities/Mandate';
import { useEditSubscriptionDropdown } from './useEditSubscriptionDropdown';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';
import { EditSubscriptionModal } from './EditSubscriptionModal';
import { RestartSubscriptionModal } from './RestartSubscriptionModal';

interface EditSubscriptionDropdownProps {
    className?: string;
    customerId: string;
    subscription: MollieSubscription;
    mandates: Mandate[];
    reloadPage?: () => void;
}

export const EditSubscriptionDropdown = memo((props: EditSubscriptionDropdownProps) => {
    const { className, customerId, subscription, mandates, reloadPage } = props;
    const {
        modal,
        isSaving,
        validMandateOptions,
        form,
        setForm,
        restartDate,
        setRestartDate,
        closeModal,
        items,
        today,
        onCancel,
        onUpdate,
        onRestart,
    } = useEditSubscriptionDropdown(customerId, subscription, mandates, reloadPage);

    return (
        <>
            <Dropdown direction="bottom left" className={classNames('', {}, [className])} items={items} trigger={<Icon Svg={Edit} width={24} height={24} color="stroke" />} />
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
