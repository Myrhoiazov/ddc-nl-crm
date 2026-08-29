import { classNames } from '@/shared/lib/classNames/classNames';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '@/shared/ui/Popups';
import { Icon } from '@/shared/ui/Icon/Icon';
import Edit from '@/shared/assets/icons/edit-icon.svg';
import { toast } from 'react-toastify';
import { Modal } from '@/shared/ui/Modal';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { Input } from '@/shared/ui/Input/Input';
import { Select } from '@/shared/ui/Select/Select';
import { $apiPrivate } from '@/shared/api/api';
import { MollieSubscription } from '@/entities/MollieSubscription';
import { Mandate } from '@/entities/Mandate';
import axios from 'axios';
import s from './EditSubscriptionDropdown.module.scss';

interface EditSubscriptionDropdownProps {
    className?: string;
    customerId: string;
    subscription: MollieSubscription;
    mandates: Mandate[];
    reloadPage?: () => void;
}

const today = new Date().toISOString().slice(0, 10);

export const EditSubscriptionDropdown = memo((props: EditSubscriptionDropdownProps) => {
    const { className, customerId, subscription, mandates, reloadPage } = props;
    const { t } = useTranslation();
    const [modal, setModal] = useState<'cancel' | 'edit' | 'restart'>();
    const [isSaving, setIsSaving] = useState(false);
    const validMandateOptions = useMemo(() => mandates
        .filter((mandate) => mandate.status === 'valid' && mandate.id)
        .map((mandate) => ({
            value: mandate.id!,
            content: `${mandate.id} · ${mandate.method || 'unknown'}`,
        })), [mandates]);
    const [form, setForm] = useState({
        mandateId: subscription.mandateId ?? validMandateOptions[0]?.value ?? '',
        amountValue: subscription.amount?.value ?? '',
        interval: subscription.interval ?? '1 month',
        startDate: subscription.nextPaymentDate?.slice(0, 10) ?? today,
        description: subscription.description ?? '',
        times: subscription.times ? String(subscription.times) : '',
    });
    const [restartDate, setRestartDate] = useState(today);

    const closeModal = useCallback(() => {
        if (!isSaving) setModal(undefined);
    }, [isSaving]);

    const openModal = useCallback((nextModal: 'cancel' | 'edit' | 'restart') => {
        if (!form.mandateId && validMandateOptions[0]?.value) {
            setForm((prev) => ({ ...prev, mandateId: validMandateOptions[0].value }));
        }
        setModal(nextModal);
    }, [form.mandateId, validMandateOptions]);

    const onCancel = useCallback(async () => {
        if (!subscription.id) return;
        setIsSaving(true);
        try {
            await $apiPrivate.delete(`/mollie/subscriptions/${subscription.id}`, {
                data: { customerId: Number(customerId) },
            });
            toast.info('Подписка отменена');
            setModal(undefined);
            reloadPage?.();
        } catch {
            toast.error('Не удалось отменить подписку');
        } finally {
            setIsSaving(false);
        }
    }, [customerId, reloadPage, subscription.id]);

    const onUpdate = useCallback(async () => {
        if (!subscription.id || !form.mandateId) return;
        setIsSaving(true);
        try {
            await $apiPrivate.patch(`/mollie/subscriptions/${subscription.id}`, {
                customerId: Number(customerId),
                mandateId: form.mandateId,
                amountValue: Number(form.amountValue),
                interval: form.interval,
                startDate: form.startDate,
                description: form.description,
                times: form.times ? Number(form.times) : undefined,
            });
            toast.success('Подписка обновлена. При изменении даты Mollie создаёт новую подписку.');
            setModal(undefined);
            reloadPage?.();
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось обновить подписку');
        } finally {
            setIsSaving(false);
        }
    }, [customerId, form, reloadPage, subscription.id]);

    const onRestart = useCallback(async () => {
        if (!subscription.id || !form.mandateId) return;
        setIsSaving(true);
        try {
            await $apiPrivate.post(`/mollie/subscriptions/${subscription.id}/restart`, {
                customerId: Number(customerId),
                mandateId: form.mandateId,
                startDate: restartDate,
            });
            toast.success('Новая подписка создана');
            setModal(undefined);
            reloadPage?.();
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось повторно запустить подписку');
        } finally {
            setIsSaving(false);
        }
    }, [customerId, form.mandateId, reloadPage, restartDate, subscription.id]);

    const items = subscription.status === 'active'
        ? [
            { content: 'Изменить подписку', onClick: () => openModal('edit') },
            { content: 'Остановить подписку', onClick: () => openModal('cancel') },
        ]
        : ['canceled', 'completed'].includes(subscription.status ?? '')
            ? [{ content: 'Запустить снова', onClick: () => openModal('restart') }]
            : [];

    return (
        <>
            <Dropdown direction="bottom left" className={classNames('', {}, [className])} items={items} trigger={<Icon Svg={Edit} width={24} height={24} color="stroke" />} />
            <Modal isOpen={modal === 'cancel'} onClose={closeModal} lazy>
                <VStack max gap="16" className={s.confirm}>
                    <Text title="Остановить подписку?" text="Она останется в истории CRM со статусом canceled." size="m" bold />
                    <div className={s.actions}>
                        <Button theme={ButtonTheme.OUTLINE} onClick={closeModal} disabled={isSaving}>{t('Закрыть')}</Button>
                        <Button theme={ButtonTheme.OUTLINE_RED} onClick={onCancel} disabled={isSaving}>{isSaving ? 'Отмена...' : 'Остановить'}</Button>
                    </div>
                </VStack>
            </Modal>
            <Modal isOpen={modal === 'edit'} onClose={closeModal} lazy>
                <VStack max gap="16" className={s.confirm}>
                    <Text title="Изменить активную подписку" text="При изменении даты CRM остановит текущую подписку и создаст новую. История сохранится." size="m" bold />
                    <Select label="Valid mandate" options={validMandateOptions} value={form.mandateId} onChange={(mandateId) => setForm((prev) => ({ ...prev, mandateId }))} />
                    <Input fullWidth label="Сумма, EUR" type="number" value={form.amountValue} onChange={(amountValue) => setForm((prev) => ({ ...prev, amountValue }))} />
                    <Input fullWidth label="Интервал" value={form.interval} onChange={(interval) => setForm((prev) => ({ ...prev, interval }))} />
                    <Input fullWidth label="Дата следующего списания" type="date" min={today} value={form.startDate} onChange={(startDate) => setForm((prev) => ({ ...prev, startDate }))} />
                    <Input fullWidth label="Количество списаний" type="number" value={form.times} onChange={(times) => setForm((prev) => ({ ...prev, times }))} />
                    <Input fullWidth label="Описание" value={form.description} onChange={(description) => setForm((prev) => ({ ...prev, description }))} />
                    <HStack max gap="8" justify="end">
                        <Button theme={ButtonTheme.OUTLINE} onClick={closeModal}>{t('Закрыть')}</Button>
                        <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onUpdate} disabled={isSaving}>{t('Сохранить')}</Button>
                    </HStack>
                </VStack>
            </Modal>
            <Modal isOpen={modal === 'restart'} onClose={closeModal} lazy>
                <VStack max gap="16" className={s.confirm}>
                    <Text title="Запустить снова" text="Будет создана новая подписка с параметрами старой." size="m" bold />
                    <Select label="Valid mandate" options={validMandateOptions} value={form.mandateId} onChange={(mandateId) => setForm((prev) => ({ ...prev, mandateId }))} />
                    <Input fullWidth label="Дата первого списания" type="date" min={today} value={restartDate} onChange={setRestartDate} />
                    <HStack max gap="8" justify="end">
                        <Button theme={ButtonTheme.OUTLINE} onClick={closeModal}>{t('Закрыть')}</Button>
                        <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onRestart} disabled={isSaving}>{t('Запустить снова')}</Button>
                    </HStack>
                </VStack>
            </Modal>
        </>
    );
});
