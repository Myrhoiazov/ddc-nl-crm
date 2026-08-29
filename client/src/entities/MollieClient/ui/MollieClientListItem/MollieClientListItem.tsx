import React, { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './MollieClientListItem.module.scss';
import { MollieClient } from '../../model/types/mollieClient';
import { HStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { Link, useNavigate } from 'react-router-dom';

interface MollieClientListItemProps {
    className?: string;
    client: MollieClient;
    renderAction?: (client: MollieClient) => ReactNode;
}

const MollieClientListItem = (props: MollieClientListItemProps) => {
    const { className, client, renderAction } = props;
    const navigate = useNavigate();
    const subscriptionsCount = client.subscriptions?.length ?? 0;
    const activeSubscriptionsCount = client.subscriptions?.filter((subscription) => subscription.status === 'active').length ?? 0;
    const mandatesCount = client.mandates?.length ?? 0;
    const validMandatesCount = client.mandates?.filter((mandate) => mandate.status === 'valid').length ?? 0;
    const payerName = client.payerName || [client.givenName, client.familyName].filter(Boolean).join(' ') || client.email || 'Плательщик';
    const initials = [client.givenName, client.familyName]
        .filter(Boolean)
        .map((part) => part?.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2) || payerName.charAt(0).toUpperCase() || '?';
    const studentLinks = client.clientLinks?.length
        ? client.clientLinks
        : client.client?.id
            ? [{ id: `legacy-${client.client.id}`, client: client.client, payerRelation: client.payerRelation }]
            : [];

    return (
        <Card
            padding="16"
            fullWidth
            shadow="shadowLight"
            className={classNames(s.MollieClientListItem, {}, [className])}
        >
            <HStack max justify="between">
                <div
                    className={classNames(s.info, {}, [s.clickable])}
                    onClick={() => navigate(`/company/customers/${client.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/company/customers/${client.id}`)}
                >
                    <p className={s.id}>{client.id}</p>
                    <div className={s.identity}>
                        <span className={s.avatar}>{initials}</span>
                        <p className={s.name}>{payerName}</p>
                    </div>
                    <p className={s.email}>{client.email}</p>
                    <div className={s.badges}>
                        <span className={classNames(s.badge, { [s.active]: activeSubscriptionsCount > 0 }, [])}>
                            Активные: {activeSubscriptionsCount}
                        </span>
                        <span className={s.badge}>Подписки: {subscriptionsCount}</span>
                        <span className={classNames(s.badge, { [s.active]: validMandatesCount > 0 }, [])}>
                            Мандаты: {mandatesCount}
                        </span>
                        {studentLinks.length ? (
                            studentLinks.map((link) => {
                                const studentName = [link.client?.firstName, link.client?.lastName].filter(Boolean).join(' ')
                                    || link.client?.email
                                    || (link.client?.id ? `Ученик #${link.client.id}` : 'Ученик');

                                return link.client?.id ? (
                                    <Link className={`${s.badge} ${s.studentLink}`} to={`/clients/${link.client.id}`} key={link.id}>
                                        Ученик: {studentName}
                                    </Link>
                                ) : null;
                            })
                        ) : (
                            <span className={`${s.badge} ${s.warning}`}>Нет ученика</span>
                        )}
                        <span className={s.badge}>Роль: {client.payerRelation || 'unknown'}</span>
                    </div>
                </div>
                {renderAction?.(client)}
            </HStack>
        </Card>
    );
};

export default memo(MollieClientListItem);
