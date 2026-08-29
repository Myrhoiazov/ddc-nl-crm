import React, { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './ClientListItem.module.scss';
import { Client, ClientView } from '../../model/types/client';
import { Card } from '@/shared/ui/Card/Card';
import { Link } from 'react-router-dom';
import { getRouteClientDetails } from '@/shared/const/router';

interface ClientListItemProps {
    className?: string;
    client: Client;
    renderAction?: (client: Client) => ReactNode;
    view: ClientView;
}

const ClientListItem = (props: ClientListItemProps) => {
    const { className, client, view, renderAction } = props;
    const fullName = [client.firstName, client.lastName].filter(Boolean).join(' ') || `Ученик #${client.id}`;
    const initials = [client.firstName, client.lastName]
        .filter(Boolean)
        .map((part) => part?.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2) || '?';
    const profileRoute = getRouteClientDetails(String(client.id));
    const hasPaymentAccount = Boolean(client.mollieLinks?.length);

    if (view === ClientView.SMALL) {
        return (
            <Card padding="16" className={classNames(s.ClientListItem, {}, [className, s[view]])}>
                <div className={s.tileHeader}>
                    <Link to={profileRoute} className={s.avatar}>
                        {typeof client.image === 'string' && client.image ? (
                            <img src={client.image} alt={fullName} />
                        ) : (
                            <span>{initials}</span>
                        )}
                    </Link>
                    <div className={s.action}>{renderAction?.(client)}</div>
                </div>
                <Link to={profileRoute} className={s.tileName}>{fullName}</Link>
                <div className={s.tileDetails}>
                    <span>{client.email || 'Email не указан'}</span>
                    <span>{client.phoneNumber || 'Телефон не указан'}</span>
                    <span>{client.branch?.name || 'Без филиала'}</span>
                </div>
                <div className={s.tileFooter}>
                    <span className={`${s.paymentBadge} ${hasPaymentAccount ? s.paymentLinked : s.paymentUnlinked}`}>
                        {hasPaymentAccount ? 'Оплата привязана' : 'Нет платёжного аккаунта'}
                    </span>
                </div>
            </Card>
        );
    }

    return (
        <Card
            padding="16"
            fullWidth
            shadow="shadowLight"
            className={classNames(s.ClientListItem, {}, [className, s[view]])}
        >
            <div className={s.row}>
                <p className={s.id}>{client.id}</p>
                <div className={s.identity}>
                    <Link to={profileRoute} className={s.rowAvatar}>
                        {typeof client.image === 'string' && client.image ? (
                            <img src={client.image} alt={fullName} />
                        ) : (
                            <span>{initials}</span>
                        )}
                    </Link>
                    <Link to={profileRoute} className={s.name}>{fullName}</Link>
                </div>
                <p className={s.email}>{client.email || '—'}</p>
                <p className={s.branch}>{client.branch?.name || '—'}</p>
                <span className={`${s.paymentBadge} ${hasPaymentAccount ? s.paymentLinked : s.paymentUnlinked}`}>
                    {hasPaymentAccount ? 'Привязана' : 'Нет'}
                </span>
                <div className={s.action}>{renderAction?.(client)}</div>
            </div>
        </Card>
    );
};

export default memo(ClientListItem);
