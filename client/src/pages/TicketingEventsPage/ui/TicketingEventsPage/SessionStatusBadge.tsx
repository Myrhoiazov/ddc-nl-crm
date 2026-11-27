import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './TicketingEventsPage.module.scss';
import type { SessionStatus } from './ticketingEventsApi';

const STATUS_CLASS: Record<SessionStatus, string | undefined> = {
    DRAFT: undefined,
    ON_SALE: s.statusOnSale,
    PAUSED: undefined,
    CLOSED: s.statusClosed,
    CANCELLED: s.statusClosed,
};

export const SessionStatusBadge = memo(({ status }: { status: SessionStatus }) => {
    const { t } = useTranslation();
    const labels: Record<SessionStatus, string> = {
        DRAFT: t('Черновик'),
        ON_SALE: t('В продаже'),
        PAUSED: t('Пауза'),
        CLOSED: t('Закрыт'),
        CANCELLED: t('Отменён'),
    };

    return <span className={classNames(s.status, {}, [STATUS_CLASS[status]])}>{labels[status]}</span>;
});
