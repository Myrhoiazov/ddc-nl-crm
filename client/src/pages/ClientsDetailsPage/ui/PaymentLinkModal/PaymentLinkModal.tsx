import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input/Input';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import s from './PaymentLinkModal.module.scss';

export interface PaymentLinkPayer {
    id: number;
    name: string;
    email?: string;
}

interface PaymentLinkModalProps {
    clientId: string;
    payers: PaymentLinkPayer[];
    isOpen: boolean;
    onClose: () => void;
    onCreated?: () => void;
}

interface PaymentLinkResponse {
    paymentId: string;
    checkoutUrl: string;
    status: string;
}

export const PaymentLinkModal = memo((props: PaymentLinkModalProps) => {
    const { clientId, payers, isOpen, onClose, onCreated } = props;
    const [payerId, setPayerId] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('Оплата занятий');
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPayerId(String(payers[0]?.id ?? ''));
            setAmount('');
            setDescription('Оплата занятий');
            setCheckoutUrl('');
        }
    }, [isOpen, payers]);

    const payerOptions = useMemo<SelectOption<string>[]>(() => payers.map((payer) => ({
        value: String(payer.id),
        content: payer.email ? `${payer.name} · ${payer.email}` : payer.name,
    })), [payers]);

    const onCreate = useCallback(async () => {
        const amountValue = Number(amount.replace(',', '.'));

        if (!payerId || !Number.isFinite(amountValue) || amountValue <= 0 || !description.trim()) {
            toast.error('Выберите плательщика, сумму и описание');
            return;
        }

        setIsLoading(true);

        try {
            const { data } = await $apiPrivate.post<PaymentLinkResponse>(
                `/mollie/customers/${payerId}/payment-link`,
                {
                    clientId: Number(clientId),
                    amountValue,
                    description: description.trim(),
                },
            );
            setCheckoutUrl(data.checkoutUrl);
            onCreated?.();
            toast.success('Payment link создан');
        } catch {
            toast.error('Не удалось создать payment link');
        } finally {
            setIsLoading(false);
        }
    }, [amount, clientId, description, onCreated, payerId]);

    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(checkoutUrl);
            toast.success('Payment link скопирован');
        } catch {
            toast.error('Не удалось скопировать ссылку');
        }
    }, [checkoutUrl]);

    const onOpen = useCallback(() => {
        window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    }, [checkoutUrl]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <VStack className={s.form} gap="16" max>
                <div className={s.titleBlock}>
                    <Text size="m" title="Отправить payment link" bold />
                    <Text size="s" text="Создайте одноразовую ссылку Mollie для выбранного плательщика." />
                </div>

                {!payers.length ? (
                    <Text
                        title="Нет связанного плательщика"
                        text="Сначала привяжите Mollie customer к ученику."
                        size="s"
                    />
                ) : (
                    <>
                        <Select
                            label="Плательщик"
                            options={payerOptions}
                            value={payerId}
                            onChange={setPayerId}
                            readonly={isLoading || Boolean(checkoutUrl)}
                        />
                        <Input
                            fullWidth
                            label="Сумма, EUR"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={amount}
                            onChange={setAmount}
                            readonly={isLoading || Boolean(checkoutUrl)}
                        />
                        <Input
                            fullWidth
                            label="Описание"
                            value={description}
                            onChange={setDescription}
                            readonly={isLoading || Boolean(checkoutUrl)}
                        />
                    </>
                )}

                {checkoutUrl && (
                    <div className={s.result}>
                        <Text text="Ссылка готова" size="s" bold />
                        <span>{checkoutUrl}</span>
                    </div>
                )}

                <HStack className={s.actions} gap="16" justify="end" wrap="wrap">
                    <Button theme={ButtonTheme.OUTLINE} onClick={onClose} disabled={isLoading}>
                        Закрыть
                    </Button>
                    {checkoutUrl ? (
                        <>
                            <Button theme={ButtonTheme.OUTLINE} onClick={onCopy}>
                                Скопировать
                            </Button>
                            <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onOpen}>
                                Открыть
                            </Button>
                        </>
                    ) : (
                        <Button
                            theme={ButtonTheme.BACKGROUND_INVERTED}
                            onClick={onCreate}
                            disabled={isLoading || !payers.length}
                        >
                            {isLoading ? 'Создание...' : 'Создать ссылку'}
                        </Button>
                    )}
                </HStack>
            </VStack>
        </Modal>
    );
});
