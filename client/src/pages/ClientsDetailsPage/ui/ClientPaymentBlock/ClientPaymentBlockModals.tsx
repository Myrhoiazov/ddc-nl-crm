import { memo, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Input } from '@/shared/ui/Input/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { PaymentLinkModal, PaymentLinkPayer } from '../PaymentLinkModal/PaymentLinkModal';
import { today } from './helpers';
import type { ClientSubscription, PaymentCustomer } from './types';
import type {
    EditSubscriptionForm,
    MandateForm,
    RestartForm,
    SubscriptionForm,
} from './useClientPaymentBlock';
import s from './ClientPaymentBlock.module.scss';

interface ClientPaymentBlockModalsProps {
    id: string;
    payers: PaymentLinkPayer[];
    isSaving: boolean;
    isPaymentLinkOpen: boolean;
    isMandateOpen: boolean;
    isSubscriptionOpen: boolean;
    mandateForm: MandateForm;
    subscriptionForm: SubscriptionForm;
    editSubscriptionForm: EditSubscriptionForm;
    editingSubscription: ClientSubscription | null;
    restartForm: RestartForm;
    restartingSubscription: ClientSubscription | null;
    payerOptions: SelectOption<string>[];
    mandateOptions: SelectOption<string>[];
    getMandateOptionsForCustomer: (customer?: PaymentCustomer | null) => SelectOption<string>[];
    onClosePaymentLink: () => void;
    onCloseMandate: () => void;
    onCloseSubscription: () => void;
    onCloseEdit: () => void;
    onCloseRestart: () => void;
    onPaymentLinkCreated: () => void;
    setMandateForm: Dispatch<SetStateAction<MandateForm>>;
    setSubscriptionForm: Dispatch<SetStateAction<SubscriptionForm>>;
    setEditSubscriptionForm: Dispatch<SetStateAction<EditSubscriptionForm>>;
    setRestartForm: Dispatch<SetStateAction<RestartForm>>;
    onCreateMandate: (form: MandateForm) => void;
    onCreateSubscription: (form: SubscriptionForm) => void;
    onUpdateSubscription: (subscription: ClientSubscription, form: EditSubscriptionForm) => void;
    onRestartSubscription: (subscription: ClientSubscription, form: RestartForm) => void;
}

export const ClientPaymentBlockModals = memo((props: ClientPaymentBlockModalsProps) => {
    const { t } = useTranslation();
    const {
        id,
        payers,
        isSaving,
        isPaymentLinkOpen,
        isMandateOpen,
        isSubscriptionOpen,
        mandateForm,
        subscriptionForm,
        editSubscriptionForm,
        editingSubscription,
        restartForm,
        restartingSubscription,
        payerOptions,
        mandateOptions,
        getMandateOptionsForCustomer,
        onClosePaymentLink,
        onCloseMandate,
        onCloseSubscription,
        onCloseEdit,
        onCloseRestart,
        onPaymentLinkCreated,
        setMandateForm,
        setSubscriptionForm,
        setEditSubscriptionForm,
        setRestartForm,
        onCreateMandate,
        onCreateSubscription,
        onUpdateSubscription,
        onRestartSubscription,
    } = props;

    return (
        <>
            <PaymentLinkModal
                clientId={id}
                payers={payers}
                isOpen={isPaymentLinkOpen}
                onClose={onClosePaymentLink}
                onCreated={onPaymentLinkCreated}
            />

            <Modal isOpen={isMandateOpen} onClose={onCloseMandate} lazy>
                <VStack gap="16" max className={s.actionModal}>
                    <Text title="Создать mandate" text="Mandate разрешает регулярные списания с IBAN плательщика." size="m" bold />
                    <Select
                        label="Плательщик"
                        defaultValue="Выберите плательщика"
                        options={payerOptions}
                        value={mandateForm.customerId}
                        onChange={(customerId) => setMandateForm((prev) => ({ ...prev, customerId }))}
                    />
                    <Input fullWidth label="Имя владельца счёта" value={mandateForm.consumerName} onChange={(consumerName) => setMandateForm((prev) => ({ ...prev, consumerName }))} />
                    <Input fullWidth label="IBAN" value={mandateForm.consumerAccount} onChange={(consumerAccount) => setMandateForm((prev) => ({ ...prev, consumerAccount }))} />
                    <Input fullWidth label="BIC, необязательно" value={mandateForm.consumerBic} onChange={(consumerBic) => setMandateForm((prev) => ({ ...prev, consumerBic }))} />
                    <Input fullWidth label="Дата подписи" type="date" value={mandateForm.signatureDate} onChange={(signatureDate) => setMandateForm((prev) => ({ ...prev, signatureDate }))} />
                    <HStack gap="8" max justify="end">
                        <Button theme={ButtonTheme.OUTLINE} onClick={onCloseMandate} disabled={isSaving}>{t('Закрыть')}</Button>
                        <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={() => onCreateMandate(mandateForm)} disabled={isSaving}>{isSaving ? 'Создание...' : 'Создать mandate'}</Button>
                    </HStack>
                </VStack>
            </Modal>

            <Modal isOpen={isSubscriptionOpen} onClose={onCloseSubscription} lazy>
                <VStack gap="16" max className={s.actionModal}>
                    <Text title="Создать подписку" text="Для подписки требуется valid mandate выбранного плательщика." size="m" bold />
                    <Select
                        label="Плательщик"
                        defaultValue="Выберите плательщика"
                        options={payerOptions}
                        value={subscriptionForm.customerId}
                        onChange={(customerId) => setSubscriptionForm((prev) => ({ ...prev, customerId, mandateId: '' }))}
                    />
                    <Select
                        label="Valid mandate"
                        defaultValue={subscriptionForm.customerId ? 'Выберите mandate' : 'Сначала выберите плательщика'}
                        options={mandateOptions}
                        value={subscriptionForm.mandateId}
                        onChange={(mandateId) => setSubscriptionForm((prev) => ({ ...prev, mandateId }))}
                    />
                    <Input fullWidth label="Сумма, EUR" type="number" min="0.01" step="0.01" value={subscriptionForm.amountValue} onChange={(amountValue) => setSubscriptionForm((prev) => ({ ...prev, amountValue }))} />
                    <Input fullWidth label="Интервал" placeholder="1 month" value={subscriptionForm.interval} onChange={(interval) => setSubscriptionForm((prev) => ({ ...prev, interval }))} />
                    <Input fullWidth label="Дата начала" type="date" value={subscriptionForm.startDate} onChange={(startDate) => setSubscriptionForm((prev) => ({ ...prev, startDate }))} />
                    <Input fullWidth label="Описание" value={subscriptionForm.description} onChange={(description) => setSubscriptionForm((prev) => ({ ...prev, description }))} />
                    <HStack gap="8" max justify="end">
                        <Button theme={ButtonTheme.OUTLINE} onClick={onCloseSubscription} disabled={isSaving}>{t('Закрыть')}</Button>
                        <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={() => onCreateSubscription(subscriptionForm)} disabled={isSaving}>{isSaving ? 'Создание...' : 'Создать подписку'}</Button>
                    </HStack>
                </VStack>
            </Modal>

            <Modal isOpen={Boolean(editingSubscription)} onClose={onCloseEdit} lazy>
                <VStack gap="16" max className={s.actionModal}>
                    <Text title="Изменить активную подписку" text="При изменении даты CRM остановит текущую подписку и создаст новую. История сохранится." size="m" bold />
                    <Select label="Valid mandate" options={getMandateOptionsForCustomer(editingSubscription?.customer)} value={editSubscriptionForm.mandateId} onChange={(mandateId) => setEditSubscriptionForm((prev) => ({ ...prev, mandateId }))} />
                    <Input fullWidth label="Сумма, EUR" type="number" min="0.01" step="0.01" value={editSubscriptionForm.amountValue} onChange={(amountValue) => setEditSubscriptionForm((prev) => ({ ...prev, amountValue }))} />
                    <Input fullWidth label="Интервал" placeholder="1 month" value={editSubscriptionForm.interval} onChange={(interval) => setEditSubscriptionForm((prev) => ({ ...prev, interval }))} />
                    <Input fullWidth label="Дата следующего списания" type="date" min={today} value={editSubscriptionForm.startDate} onChange={(startDate) => setEditSubscriptionForm((prev) => ({ ...prev, startDate }))} />
                    <Input fullWidth label="Количество списаний, необязательно" type="number" min="1" value={editSubscriptionForm.times} onChange={(times) => setEditSubscriptionForm((prev) => ({ ...prev, times }))} />
                    <Input fullWidth label="Описание" value={editSubscriptionForm.description} onChange={(description) => setEditSubscriptionForm((prev) => ({ ...prev, description }))} />
                    <HStack gap="8" max justify="end">
                        <Button theme={ButtonTheme.OUTLINE} onClick={onCloseEdit} disabled={isSaving}>{t('Закрыть')}</Button>
                        <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={() => editingSubscription && onUpdateSubscription(editingSubscription, editSubscriptionForm)} disabled={isSaving}>{isSaving ? 'Сохранение...' : 'Сохранить'}</Button>
                    </HStack>
                </VStack>
            </Modal>

            <Modal isOpen={Boolean(restartingSubscription)} onClose={onCloseRestart} lazy>
                <VStack gap="16" max className={s.actionModal}>
                    <Text title="Запустить подписку снова" text="Mollie создаст новую подписку с параметрами старой. Старая останется в истории." size="m" bold />
                    <Select label="Valid mandate" options={getMandateOptionsForCustomer(restartingSubscription?.customer)} value={restartForm.mandateId} onChange={(mandateId) => setRestartForm((prev) => ({ ...prev, mandateId }))} />
                    <Input fullWidth label="Дата первого списания" type="date" min={today} value={restartForm.startDate} onChange={(startDate) => setRestartForm((prev) => ({ ...prev, startDate }))} />
                    <HStack gap="8" max justify="end">
                        <Button theme={ButtonTheme.OUTLINE} onClick={onCloseRestart} disabled={isSaving}>{t('Закрыть')}</Button>
                        <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={() => restartingSubscription && onRestartSubscription(restartingSubscription, restartForm)} disabled={isSaving}>{isSaving ? 'Запуск...' : 'Запустить снова'}</Button>
                    </HStack>
                </VStack>
            </Modal>
        </>
    );
});
