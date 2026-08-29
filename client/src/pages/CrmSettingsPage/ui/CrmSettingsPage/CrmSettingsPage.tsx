import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { $apiPrivate } from '@/shared/api/api';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import s from './CrmSettingsPage.module.scss';

interface MollieConnectionStatus {
    source: 'oauth' | 'api_key' | 'none';
    isConnected: boolean;
    connectedByCurrentUser: boolean;
    expiresAt?: string;
    lastRefreshedAt?: string;
    updatedAt?: string;
}

const CrmSettingsPage = memo(() => {
    const { t } = useTranslation();
    const [connection, setConnection] = useState<MollieConnectionStatus>();
    const [isLoading, setIsLoading] = useState(true);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        $apiPrivate.get<MollieConnectionStatus>('/mollie/connection/status')
            .then(({ data }) => setConnection(data))
            .catch(() => setError(true))
            .finally(() => setIsLoading(false));
    }, []);

    const formatDate = (value?: string) => {
        if (!value) {
            return '—';
        }

        return new Date(value).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const onConnect = () => {
        window.location.assign(`${__API__}/api/v1/mollie/connect`);
    };

    const onDisconnect = async () => {
        if (!window.confirm('Отключить OAuth-подключение Mollie?')) {
            return;
        }

        setIsDisconnecting(true);

        try {
            const { data } = await $apiPrivate.post<{ fallback: 'api_key' | 'none' }>('/mollie/connection/disconnect');
            setConnection({
                source: data.fallback,
                isConnected: data.fallback === 'api_key',
                connectedByCurrentUser: false,
            });
        } finally {
            setIsDisconnecting(false);
        }
    };

    return (
        <Page>
            <VStack max gap="24" className={s.page}>
                <div>
                    <Text title="Настройки CRM" size="l" bold />
                    <Text text="Интеграции и системные параметры CRM." size="s" className={s.subtitle} />
                </div>

                {isLoading && <Skeleton width="100%" height={360} border="16px" />}

                {error && (
                    <Card padding="24" fullWidth className={s.card}>
                        <Text title="Не удалось загрузить статус Mollie" text="Проверьте соединение с сервером." size="m" />
                    </Card>
                )}

                {!isLoading && !error && connection && (
                    <Card padding="24" fullWidth className={s.card}>
                        <VStack max gap="16">
                            <div className={s.header}>
                                <div>
                                    <Text title="Интеграция Mollie OAuth" size="m" bold />
                                    <Text text="Дополнительный способ подключения Mollie к CRM." size="s" className={s.subtitle} />
                                </div>
                                <span className={`${s.badge} ${connection.isConnected ? s.connected : s.disconnected}`}>
                                    {connection.source === 'oauth' ? 'OAuth подключён' : connection.source === 'api_key' ? 'Используется API key' : 'Не подключено'}
                                </span>
                            </div>

                            <div className={s.explanation}>
                                <Text title="Для чего это нужно" size="s" bold />
                                <p>
                                    {t('OAuth нужен, если CRM будет подключать Mollie-аккаунты разных компаний или если доступ необходимо выдавать и отзывать из Mollie без ручной замены API key. CRM сохраняет зашифрованные токены и автоматически обновляет их.')}
                                </p>
                                <p>
                                    {t('Для текущей CRM с одной организацией OAuth необязателен: система продолжает работать через настроенный серверный API key. Подключайте OAuth только при необходимости.')}
                                </p>
                            </div>

                            {connection.source === 'oauth' && (
                                <div className={s.detailsGrid}>
                                    <div className={s.detailItem}>
                                        <span className={s.label}>{t('Токен истекает')}</span>
                                        <span>{formatDate(connection.expiresAt)}</span>
                                    </div>
                                    <div className={s.detailItem}>
                                        <span className={s.label}>{t('Последнее обновление')}</span>
                                        <span>{formatDate(connection.lastRefreshedAt || connection.updatedAt)}</span>
                                    </div>
                                </div>
                            )}

                            <HStack gap="8" wrap="wrap">
                                <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onConnect}>
                                    {connection.source === 'oauth' ? 'Переподключить OAuth' : 'Подключить OAuth'}
                                </Button>
                                {connection.source === 'oauth' && connection.connectedByCurrentUser && (
                                    <Button theme={ButtonTheme.OUTLINE_RED} disabled={isDisconnecting} onClick={onDisconnect}>
                                        {isDisconnecting ? 'Отключение...' : 'Отключить OAuth'}
                                    </Button>
                                )}
                            </HStack>
                        </VStack>
                    </Card>
                )}
            </VStack>
        </Page>
    );
});

export default CrmSettingsPage;
