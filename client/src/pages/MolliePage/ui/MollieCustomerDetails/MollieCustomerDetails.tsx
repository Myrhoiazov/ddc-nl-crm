import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import { fetchAllMandates } from '../../model/services/fetchAllMandates/fetchAllMandates';
import { fetchAllSubscriptions } from '../../model/services/fetchAllSubscriptions/fetchAllSubscriptions';
import { MollieClientDetails } from '@/entities/MollieClient';
import { MollieClient, MolliePayment } from '@/entities/MollieClient';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import { MandateList } from '@/entities/Mandate';
import {
    getMollieClientsPageIsLoading,
    getMollieClientsPageMandates,
    getMollieClientsPageSubscriptions,
} from '../../model/selectors/mollieClientsPageSelectors';
import { useSelector } from 'react-redux';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { mollieClientsPageSliceReducer } from '../../model/slices/mollieClientsDetailsPageSlice';
import { MollieSubscriptionList } from '@/entities/MollieSubscription';
import { EditSubscriptionDropdown } from '@/features/editSubscriptionDropdown';
import { $apiPrivate } from '@/shared/api/api';
import { Card } from '@/shared/ui/Card/Card';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import s from './MollieCustomerDetails.module.scss';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { MollieClientFormModal, mollieClientReducer, fetchMollieClientData } from '@/features/editMollieClientDropdown';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { Client } from '@/entities/Client';
import { toast } from 'react-toastify';
import { Mandate } from '@/entities/Mandate';
import axios from 'axios';

interface MollieCustomerDetailsProps {
    className?: string;
}

const reducers: ReducersList = {
    customerDetailsMandates: mollieClientsPageSliceReducer,
    mollieClientForm: mollieClientReducer,
};

const paymentDate = (payment: MolliePayment) => payment.paidAt || payment.createdAt || payment.updatedAt;

const formatDate = (value?: string) => {
    if (!value) {
        return 'Без даты';
    }

    return new Date(value).toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const formatAmount = (payment: MolliePayment) => {
    const amount = Number(payment.amountValue ?? 0);
    const currency = payment.amountCurrency || 'EUR';

    return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency,
    }).format(Number.isFinite(amount) ? amount : 0);
};

const paymentStatusLabel: Record<string, string> = {
    paid: 'Оплачено',
    canceled: 'Отменено',
    cancelled: 'Отменено',
    failed: 'Ошибка',
    expired: 'Истекло',
    pending: 'Ожидает',
    open: 'Открыто',
    charged_back: 'Chargeback',
    chargeback: 'Chargeback',
};

type PayerRelation = 'unknown' | 'self' | 'parent' | 'guardian' | 'other';

const payerRelationOptions: SelectOption<PayerRelation>[] = [
    { value: 'parent', content: 'Родитель' },
    { value: 'self', content: 'Сам ученик' },
    { value: 'guardian', content: 'Опекун' },
    { value: 'other', content: 'Другой плательщик' },
    { value: 'unknown', content: 'Неизвестно' },
];

const getStudentName = (client?: {
    id?: string | number;
    firstName?: string;
    lastName?: string;
    email?: string;
} | null) => (
    [client?.firstName, client?.lastName].filter(Boolean).join(' ')
    || client?.email
    || (client?.id ? `Ученик #${client.id}` : 'Ученик')
);

const MollieStudentLinksManager = memo(({
    customerId,
    version,
    onChanged,
}: {
    customerId: string;
    version: number;
    onChanged: () => void;
}) => {
    const { t } = useTranslation();
    const [customer, setCustomer] = useState<MollieClient | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [payerRelation, setPayerRelation] = useState<PayerRelation>('parent');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        setError(false);

        Promise.all([
            $apiPrivate.get<MollieClient>(`/mollie/customers/${customerId}`),
            $apiPrivate.get<Client[]>('/clients'),
        ])
            .then(([customerResponse, clientsResponse]) => {
                setCustomer(customerResponse.data);
                setClients(clientsResponse.data ?? []);
            })
            .catch(() => {
                setError(true);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [customerId, version]);

    const clientOptions = useMemo(
        () => clients.map((client) => ({
            value: String(client.id),
            content: `${getStudentName(client)}${client.email ? ` · ${client.email}` : ''}`,
        })),
        [clients],
    );

    const linkedClientIds = useMemo(
        () => new Set((customer?.clientLinks ?? [])
            .map((link) => link.client?.id)
            .filter(Boolean)
            .map(String)),
        [customer],
    );

    const availableClientOptions = useMemo(
        () => clientOptions.filter((option) => !linkedClientIds.has(option.value)),
        [clientOptions, linkedClientIds],
    );

    const onAddStudent = async () => {
        if (!selectedClientId) {
            toast.error('Выберите ученика');
            return;
        }

        setIsSaving(true);

        try {
            const { data } = await $apiPrivate.post<MollieClient>(
                `/mollie/customers/${customerId}/student-links`,
                {
                    clientId: selectedClientId,
                    payerRelation,
                    isPrimary: !(customer?.clientLinks?.length),
                },
            );

            setCustomer(data);
            setSelectedClientId('');
            onChanged();
            toast.success('Ученик привязан к платёжному профилю');
        } catch {
            toast.error('Не удалось привязать ученика');
        } finally {
            setIsSaving(false);
        }
    };

    const onDeleteLink = async (linkId: string | number) => {
        if (!window.confirm('Удалить связь ученика с платёжным профилем?')) {
            return;
        }

        setIsSaving(true);

        try {
            const { data } = await $apiPrivate.delete<MollieClient>(
                `/mollie/customers/${customerId}/student-links/${linkId}`,
            );

            setCustomer(data);
            onChanged();
            toast.success('Связь удалена');
        } catch {
            toast.error('Не удалось удалить связь');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card padding="16" fullWidth className={s.studentLinksCard}>
            <VStack gap="16" max>
                <div>
                    <Text title="Ученики этого плательщика" size="m" bold />
                    <Text text="Один родительский платёжный профиль может оплачивать несколько учеников." size="s" className={s.subtitle} />
                </div>

                {isLoading && (
                    <>
                        <Skeleton width="100%" height={48} border="12px" />
                        <Skeleton width="100%" height={48} border="12px" />
                    </>
                )}

                {error && (
                    <Text text="Не удалось загрузить связи с учениками." size="s" />
                )}

                {!isLoading && !error && (
                    <>
                        <div className={s.linkedStudents}>
                            {customer?.clientLinks?.length ? customer.clientLinks.map((link) => (
                                <div className={s.studentLinkRow} key={link.id}>
                                    <div className={s.studentInfo}>
                                        {link.client?.id ? (
                                            <Link className={s.studentName} to={`/clients/${link.client.id}`}>
                                                {getStudentName(link.client)}
                                            </Link>
                                        ) : (
                                            <span className={s.studentName}>{t('Ученик')}</span>
                                        )}
                                        <span className={s.studentMeta}>
                                            {link.payerRelation || 'unknown'} · {link.linkSource || 'manual'}{link.isPrimary ? ' · primary' : ''}
                                        </span>
                                    </div>
                                    <Button
                                        theme={ButtonTheme.OUTLINE_RED}
                                        onClick={() => onDeleteLink(link.id)}
                                        disabled={isSaving}
                                    >
                                        {t('Удалить')}
                                    </Button>
                                </div>
                            )) : (
                                <Text text="Пока нет связанных учеников." size="s" />
                            )}
                        </div>

                        <div className={s.addStudentForm}>
                            <Select
                                label="Ученик"
                                defaultValue="Выберите ученика"
                                options={availableClientOptions}
                                value={selectedClientId}
                                onChange={setSelectedClientId}
                            />
                            <Select<PayerRelation>
                                label="Кто платит"
                                options={payerRelationOptions}
                                value={payerRelation}
                                onChange={setPayerRelation}
                            />
                            <Button
                                className={s.addStudentButton}
                                theme={ButtonTheme.BACKGROUND_INVERTED}
                                onClick={onAddStudent}
                                disabled={isSaving || !availableClientOptions.length}
                            >
                                {t('Привязать')}
                            </Button>
                        </div>
                    </>
                )}
            </VStack>
        </Card>
    );
});

const MolliePaymentHistory = memo(({ customerId }: { customerId: string }) => {
    const { t } = useTranslation();
    const [payments, setPayments] = useState<MolliePayment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    const loadPayments = useCallback(() => {
        setIsLoading(true);
        setError(false);

        $apiPrivate.get<MollieClient>(`/mollie/customers/${customerId}`, {
            params: { _ts: Date.now() },
            headers: { 'Cache-Control': 'no-cache' },
        })
            .then(({ data }) => {
                setPayments(data.payments ?? []);
            })
            .catch(() => {
                setError(true);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [customerId]);

    useEffect(() => {
        loadPayments();

        window.addEventListener('focus', loadPayments);

        return () => {
            window.removeEventListener('focus', loadPayments);
        };
    }, [loadPayments]);

    const loadPaymentInvoice = async (payment: MolliePayment) => {
        const response = await $apiPrivate.get(`/mollie/payments/${payment.id}/invoice.pdf`, {
            responseType: 'blob',
        });
        return URL.createObjectURL(response.data);
    };

    const previewPaymentInvoice = async (payment: MolliePayment) => {
        const previewWindow = window.open('', '_blank');
        if (previewWindow) {
            previewWindow.opener = null;
            previewWindow.document.title = 'Загрузка инвойса...';
        }
        try {
            const url = await loadPaymentInvoice(payment);
            if (previewWindow) {
                previewWindow.location.href = url;
            } else {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch {
            previewWindow?.close();
            toast.error('Не удалось открыть инвойс платежа');
        }
    };

    const downloadPaymentInvoice = async (payment: MolliePayment) => {
        try {
            const url = await loadPaymentInvoice(payment);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${payment.mollieId || `mollie-payment-${payment.id}`}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Не удалось скачать инвойс платежа');
        }
    };

    const groupedPayments = useMemo(() => {
        const sortedPayments = [...payments].sort((first, second) => {
            const firstDate = paymentDate(first) ? new Date(paymentDate(first) as string).getTime() : 0;
            const secondDate = paymentDate(second) ? new Date(paymentDate(second) as string).getTime() : 0;

            return secondDate - firstDate;
        });

        return sortedPayments.reduce<Record<string, MolliePayment[]>>((acc, payment) => {
            const date = formatDate(paymentDate(payment));
            acc[date] = acc[date] ? [...acc[date], payment] : [payment];
            return acc;
        }, {});
    }, [payments]);

    if (isLoading) {
        return (
            <VStack max gap="16">
                <Text title="Платежи и отмены по датам" size="m" bold />
                <Skeleton width="100%" height={72} border="14px" />
                <Skeleton width="100%" height={72} border="14px" />
            </VStack>
        );
    }

    if (error) {
        return (
            <Card padding="24" fullWidth className={s.historyCard}>
                <Text title="Платежи и отмены по датам" size="m" bold />
                <Text text="Не удалось загрузить историю платежей." size="s" />
            </Card>
        );
    }

    return (
        <VStack max gap="16" className={s.history}>
            <Text title="Платежи и отмены по датам" size="m" bold />
            {!payments.length ? (
                <Card padding="24" fullWidth className={s.historyCard}>
                    <Text text="Платежи пока не найдены." size="s" />
                </Card>
            ) : Object.entries(groupedPayments).map(([date, items]) => (
                <Card padding="16" fullWidth className={s.historyCard} key={date}>
                    <VStack max gap="16">
                        <span className={s.historyDate}>{date}</span>
                        {items.map((payment) => (
                            <div className={s.paymentRow} key={payment.id ?? payment.mollieId}>
                                <div className={s.paymentMain}>
                                    <span className={s.paymentDescription}>
                                        {payment.description || payment.mollieId || 'Mollie payment'}
                                    </span>
                                    <span className={s.paymentMeta}>
                                        {payment.method || '—'} · {payment.mollieId || 'без Mollie ID'}
                                    </span>
                                </div>
                                <span className={s.paymentAmount}>{formatAmount(payment)}</span>
                                <span
                                    className={classNames(s.paymentStatus, {
                                        [s.paid]: payment.status === 'paid',
                                        [s.canceled]: ['canceled', 'cancelled', 'failed', 'expired', 'charged_back', 'chargeback'].includes(payment.status ?? ''),
                                    }, [])}
                                >
                                    {paymentStatusLabel[payment.status ?? ''] || payment.status || 'unknown'}
                                </span>
                                {payment.id && (
                                    <div className={s.paymentActions}>
                                        <button type="button" onClick={() => previewPaymentInvoice(payment)}>{t('Просмотр')}</button>
                                        <button type="button" onClick={() => downloadPaymentInvoice(payment)}>{t('Скачать')}</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </VStack>
                </Card>
            ))}
        </VStack>
    );
});

export const MollieCustomerDetails = memo(({ className }: MollieCustomerDetailsProps) => {
    const { t } = useTranslation();
    const { id: customerId } = useParams();
    const dispatch = useAppDispatch();
    const mandates = useSelector(getMollieClientsPageMandates);
    const subscriptions = useSelector(getMollieClientsPageSubscriptions);
    const isLoading = useSelector(getMollieClientsPageIsLoading);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [detailsVersion, setDetailsVersion] = useState(0);

    useInitialEffect(() => {
        if (customerId) {
            dispatch(fetchAllMandates({ customerId }));
            dispatch(fetchAllSubscriptions({ customerId }));
        }
    });

    if (!customerId) {
        return null;
    }

    const onOpenEditModal = async () => {
        setIsEditModalOpen(true);
        dispatch(fetchMollieClientData(customerId));
    };

    const onCloseEditModal = () => {
        setIsEditModalOpen(false);
    };

    const onReloadCustomerDetails = () => {
        setDetailsVersion((version) => version + 1);
        dispatch(fetchAllMandates({ customerId }));
        dispatch(fetchAllSubscriptions({ customerId }));
    };

    const onRevokeMandate = async (mandate: Mandate) => {
        if (mandate.status !== 'valid' || !mandate.id
            || !window.confirm('Отозвать mandate? Все связанные активные подписки будут отменены. Действие необратимо.')) {
            return;
        }

        try {
            await $apiPrivate.delete(`/mollie/customers/${customerId}/mandates/${mandate.id}`);
            toast.success('Mandate отозван');
            onReloadCustomerDetails();
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось отозвать mandate');
        }
    };

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
