import { memo, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './MollieClientList.module.scss';
import { HStack, VStack } from '@/shared/ui/Stack';
import MollieClientListItem from '../MollieClientListItem/MollieClientListItem';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { MollieClient } from '../../model/types/mollieClient';
import { Card } from '@/shared/ui/Card/Card';
import { StateView } from '@/shared/ui/StateView';

interface MollieClientListProps {
    className?: string;
    clients: MollieClient[];
    isLoading?: boolean;
    error?: string;
    renderAction?: (client: MollieClient) => ReactNode;
}

const MollieClientListSkeleton = () => (
    <VStack gap="16" max>
        {new Array(6).fill(null).map((_, index) => (
            <Card key={index} padding="16" fullWidth shadow="shadowLight">
                <HStack max justify="between" gap="16">
                    <HStack gap="48" max>
                        <Skeleton width={40} height={20} border="8px" />
                        <Skeleton width={100} height={20} border="8px" />
                        <Skeleton width={220} height={20} border="8px" />
                        <Skeleton width={260} height={20} border="8px" />
                    </HStack>
                    <Skeleton width={40} height={32} border="8px" />
                </HStack>
            </Card>
        ))}
    </VStack>
);

export const MollieClientList = memo((props: MollieClientListProps) => {
    const { className, isLoading, clients, error, renderAction } = props;

    if (error) {
        return (
            <StateView
                className={classNames(s.MollieClientList, {}, [className])}
                tone="error"
                title="Не удалось загрузить платёжные профили"
                text="Проверьте подключение к базе или попробуйте обновить страницу."
            />
        );
    }

    if (isLoading && !clients.length) {
        return (
            <div className={classNames(s.MollieClientList, {}, [className])}>
                <MollieClientListSkeleton />
            </div>
        );
    }

    if (!isLoading && !clients.length) {
        return (
            <StateView
                className={classNames(s.MollieClientList, {}, [className])}
                title="Платёжные профили не найдены"
                text="Нажмите Sync Mollie на главной странице, чтобы подтянуть клиентов из Mollie."
            />
        );
    }

    const renderClient = (client: MollieClient) => (
        <MollieClientListItem
            className={s.card}
            client={client}
            key={client.id}
            renderAction={renderAction}
        />
    );

    return (
        <div className={classNames(s.MollieClientList, {}, [className])}>
            <VStack gap="16" max>
                {clients.length > 0 ? clients.map(renderClient) : null}
                {isLoading && (
                    <MollieClientListSkeleton />
                )}
            </VStack>
        </div>
    );
});
