import React, { memo, useEffect } from 'react';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { mollieClientDetailsSliceReducer } from '../../model/slice/clientDetailsSlice';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { fetchClientById } from '../../model/services/fetchClientById/fetchClientById';
import { useSelector } from 'react-redux';
import {
    getClientDetailsData,
    getClientDetailsError,
    getClientDetailsIsLoading,
} from '../../model/selectors/clientDetails';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Card } from '@/shared/ui/Card/Card';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import s from './ClientDetails.module.scss';
import { Link } from 'react-router-dom';
import { CLIENT_LANGUAGE_LABELS } from '@/entities/Client';

interface ClientDetailsProps {
    id: string;
}

const reducers: ReducersList = {
    mollieClientDetails: mollieClientDetailsSliceReducer,
};

const ClientElementSkeleton = () => {
    return (
        <Card className={s.card} padding="32" fullWidth>
            <HStack gap="32" max align="start">
                <VStack gap="16" max>
                    <Skeleton width={300} height={32} />
                    <Skeleton width="100%" height={100} />
                    <Skeleton width={300} height={32} />
                    <Skeleton width="100%" height={100} />
                    <Skeleton width={300} height={32} />
                    <Skeleton width={300} height={32} />
                    <Skeleton width="100%" height={100} />
                </VStack>
                <Skeleton width={400} height={400} border="10%" />
            </HStack>
        </Card>
    );
};

const ClientElement = () => {
    const client = useSelector(getClientDetailsData);
    const fullName = [client?.givenName, client?.familyName].filter(Boolean).join(' ') || 'Без имени';
    const payerName = client?.payerName || fullName;
    const studentLinks = client?.clientLinks?.length
        ? client.clientLinks
        : client?.client?.id
            ? [{ id: `legacy-${client.client.id}`, client: client.client, payerRelation: client.payerRelation }]
            : [];
    const details = [
        { label: 'Email', value: client?.email },
        { label: 'Payer relation', value: client?.payerRelation },
        { label: 'Link source', value: client?.linkSource },
        { label: 'Consumer name', value: client?.consumerName },
        { label: 'Consumer account', value: client?.consumerAccount },
        { label: 'Consumer BIC', value: client?.consumerBic },
        { label: 'Mollie ID', value: client?.mollieId },
        { label: 'Язык письма-напоминания', value: CLIENT_LANGUAGE_LABELS[client?.preferredLanguage ?? 'RU'] },
    ].filter((item) => item.value);
    const formatEventDate = (value?: string) => {
        if (!value) {
            return 'Дата неизвестна';
        }

        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? value
            : date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
    };

    return (
        <VStack gap="16" max>
            <Card padding="24" fullWidth className={s.detailsCard}>
                <VStack gap="16" max>
                    <div>
                        <Text title={payerName} size="m" bold />
                        <Text text="Платёжный профиль Mollie" size="s" className={s.subtitle} />
                    </div>
                    <div className={s.crmBlock}>
                        <span className={s.detailLabel}>Ученики</span>
                        {studentLinks.length ? (
                            <div className={s.studentLinks}>
                                {studentLinks.map((link) => {
                                    const studentName = [link.client?.firstName, link.client?.lastName].filter(Boolean).join(' ')
                                        || link.client?.email
                                        || (link.client?.id ? `Ученик #${link.client.id}` : 'Ученик');

                                    return link.client?.id ? (
                                        <Link className={s.crmLink} to={`/clients/${link.client.id}`} key={link.id}>
                                            {studentName}
                                        </Link>
                                    ) : null;
                                })}
                            </div>
                        ) : (
                            <span className={s.detailValue}>Не привязан</span>
                        )}
                    </div>
                    <div className={s.detailsGrid}>
                        {details.map((item) => (
                            <div className={s.detailItem} key={item.label}>
                                <span className={s.detailLabel}>{item.label}</span>
                                <span className={s.detailValue}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </VStack>
            </Card>
            <Card padding="24" fullWidth className={s.detailsCard}>
                <VStack gap="16" max>
                    <div>
                        <Text title="История событий Mollie" size="s" bold />
                        <Text text="Последние webhook-события по платежам этого профиля" size="s" className={s.subtitle} />
                    </div>
                    {client?.events?.length ? (
                        <div className={s.timeline}>
                            {client.events.map((event) => (
                                <div className={s.timelineItem} key={event.id}>
                                    <span
                                        className={`${s.timelineMarker} ${
                                            event.processingStatus === 'failed' ? s.timelineMarkerFailed : s.timelineMarkerProcessed
                                        }`}
                                    />
                                    <div className={s.timelineContent}>
                                        <div className={s.timelineHeader}>
                                            <span className={s.timelineTitle}>
                                                Платёж {event.paymentStatus || 'получен'}
                                            </span>
                                            <span className={s.timelineDate}>{formatEventDate(event.receivedAt)}</span>
                                        </div>
                                        <span className={s.timelineMeta}>
                                            {event.molliePaymentId} · {event.processingStatus}
                                        </span>
                                        {event.errorMessage && (
                                            <span className={s.timelineError}>{event.errorMessage}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Text text="Webhook-событий пока нет" size="s" className={s.subtitle} />
                    )}
                </VStack>
            </Card>
        </VStack>
    );
};

export const ClientDetails = memo((props: ClientDetailsProps) => {
    const { id } = props;
    const dispatch = useAppDispatch();
    const isLoading = useSelector(getClientDetailsIsLoading);
    const error = useSelector(getClientDetailsError);

    useEffect(() => {
        if (id) {
            dispatch(fetchClientById(id));
        }
    }, [dispatch, id]);

    let content;

    if (isLoading) {
        content = <ClientElementSkeleton />;
    } else if (error) {
        content = <Text title="Клиента не существует" align="center" />;
    } else {
        content = <ClientElement />;
    }

    return <DynamicModuleLoader reducers={reducers}>{content}</DynamicModuleLoader>;
});
