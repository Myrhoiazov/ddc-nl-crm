import { memo } from 'react';
import { Card } from '@/shared/ui/Card/Card';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import s from './ClientPaymentBlock.module.scss';
import { useClientPaymentBlock } from './useClientPaymentBlock';
import { ClientPaymentHeader } from './ClientPaymentHeader';
import { ClientPaymentMetrics } from './ClientPaymentMetrics';
import { ClientPayersSection } from './ClientPayersSection';
import { ClientSubscriptionsSection } from './ClientSubscriptionsSection';
import { ClientMandatesSection } from './ClientMandatesSection';
import { ClientPaymentLinksSection } from './ClientPaymentLinksSection';
import { ClientLatestPaymentsSection } from './ClientLatestPaymentsSection';
import { ClientPaymentBlockModals } from './ClientPaymentBlockModals';

interface ClientPaymentBlockProps {
    id: string;
}

export const ClientPaymentBlock = memo(({ id }: ClientPaymentBlockProps) => {
    const {
        data,
        isLoading,
        error,
        isPaymentLinkOpen,
        setIsPaymentLinkOpen,
        isMandateOpen,
        setIsMandateOpen,
        isSubscriptionOpen,
        setIsSubscriptionOpen,
        editingSubscription,
        setEditingSubscription,
        restartingSubscription,
        setRestartingSubscription,
        isSaving,
        mandateForm,
        setMandateForm,
        subscriptionForm,
        setSubscriptionForm,
        editSubscriptionForm,
        setEditSubscriptionForm,
        restartForm,
        setRestartForm,
        payers,
        payerOptions,
        mandateOptions,
        getMandateOptionsForCustomer,
        onPaymentLinkCreated,
        onCopyPaymentLink,
        onCancelPaymentLink,
        onCreateMandate,
        onCreateSubscription,
        onCancelSubscription,
        onOpenEditSubscription,
        onUpdateSubscription,
        onOpenRestartSubscription,
        onRestartSubscription,
        onRevokeMandate,
        statusText,
    } = useClientPaymentBlock({ id });

    if (isLoading) {
        return (
            <Card id="mollie-account" padding="24" fullWidth className={s.card}>
                <VStack gap="16" max>
                    <Skeleton width={260} height={28} />
                    <Skeleton width="100%" height={72} border="12px" />
                    <Skeleton width="100%" height={72} border="12px" />
                </VStack>
            </Card>
        );
    }

    if (error) {
        return (
            <Card id="mollie-account" padding="24" fullWidth className={s.card}>
                <Text title="Платежи ученика" text="Не удалось загрузить платежный блок." size="m" />
            </Card>
        );
    }

    return (
        <Card id="mollie-account" padding="24" fullWidth className={s.card}>
            <VStack gap="16" max>
                <ClientPaymentHeader
                    statusText={statusText}
                    paymentStatus={data?.summary.paymentStatus ?? 'unknown'}
                    onOpenPaymentLink={() => setIsPaymentLinkOpen(true)}
                    onOpenMandate={() => setIsMandateOpen(true)}
                    onOpenSubscription={() => setIsSubscriptionOpen(true)}
                />

                <ClientPaymentMetrics
                    payerCount={data?.summary.payerCount}
                    activeSubscriptionCount={data?.summary.activeSubscriptionCount}
                    lastPayment={data?.summary.lastPayment}
                />

                <ClientPayersSection payers={data?.payers} />

                <ClientSubscriptionsSection
                    subscriptions={data?.subscriptions}
                    onOpenEdit={onOpenEditSubscription}
                    onCancel={onCancelSubscription}
                    onOpenRestart={onOpenRestartSubscription}
                />

                <ClientMandatesSection
                    mandates={data?.mandates}
                    onRevoke={onRevokeMandate}
                />

                <ClientPaymentLinksSection
                    paymentLinks={data?.paymentLinks}
                    onCopy={onCopyPaymentLink}
                    onCancel={onCancelPaymentLink}
                />

                <ClientLatestPaymentsSection latestPayments={data?.latestPayments} />
            </VStack>

            <ClientPaymentBlockModals
                id={id}
                payers={payers}
                isSaving={isSaving}
                isPaymentLinkOpen={isPaymentLinkOpen}
                isMandateOpen={isMandateOpen}
                isSubscriptionOpen={isSubscriptionOpen}
                mandateForm={mandateForm}
                subscriptionForm={subscriptionForm}
                editSubscriptionForm={editSubscriptionForm}
                editingSubscription={editingSubscription}
                restartForm={restartForm}
                restartingSubscription={restartingSubscription}
                payerOptions={payerOptions}
                mandateOptions={mandateOptions}
                getMandateOptionsForCustomer={getMandateOptionsForCustomer}
                onClosePaymentLink={() => setIsPaymentLinkOpen(false)}
                onCloseMandate={() => setIsMandateOpen(false)}
                onCloseSubscription={() => setIsSubscriptionOpen(false)}
                onCloseEdit={() => setEditingSubscription(null)}
                onCloseRestart={() => setRestartingSubscription(null)}
                onPaymentLinkCreated={onPaymentLinkCreated}
                setMandateForm={setMandateForm}
                setSubscriptionForm={setSubscriptionForm}
                setEditSubscriptionForm={setEditSubscriptionForm}
                setRestartForm={setRestartForm}
                onCreateMandate={onCreateMandate}
                onCreateSubscription={onCreateSubscription}
                onUpdateSubscription={onUpdateSubscription}
                onRestartSubscription={onRestartSubscription}
            />
        </Card>
    );
});
