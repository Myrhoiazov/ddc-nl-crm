import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { $apiPrivate } from '@/shared/api/api';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { logout } from '@/entities/User';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';
import { StateView } from '@/shared/ui/StateView';
import cls from './ActiveSessions.module.scss';

interface SessionItem {
    id: number;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt: string;
    lastUsedAt?: string | null;
    expiresAt: string;
    isCurrent: boolean;
}

const formatDate = (value?: string | null) => {
    if (!value) return '—';
    return new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
};

const formatDevice = (userAgent?: string | null) => {
    if (!userAgent) return 'Unknown device';
    const browser = userAgent.includes('Chrome')
        ? 'Chrome'
        : userAgent.includes('Safari')
            ? 'Safari'
            : userAgent.includes('Firefox')
                ? 'Firefox'
                : 'Browser';
    const os = userAgent.includes('Mac OS X')
        ? 'macOS'
        : userAgent.includes('Windows')
            ? 'Windows'
            : userAgent.includes('Android')
                ? 'Android'
                : userAgent.includes('iPhone') || userAgent.includes('iPad')
                    ? 'iOS'
                    : 'Unknown OS';
    return `${browser} · ${os}`;
};

export const ActiveSessions = memo(() => {
    const { t } = useTranslation('profile');
    const dispatch = useAppDispatch();
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isMutating, setIsMutating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const otherSessionsCount = useMemo(
        () => sessions.filter((session) => !session.isCurrent).length,
        [sessions],
    );

    const loadSessions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data } = await $apiPrivate.get<{ data: SessionItem[] }>('/profile/sessions');
            setSessions(data.data);
        } catch (e) {
            setError(t('Не удалось загрузить активные сессии'));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const revokeSession = useCallback(async (session: SessionItem) => {
        if (session.isCurrent) {
            dispatch(logout());
            return;
        }

        setIsMutating(true);
        setError(null);
        try {
            await $apiPrivate.delete(`/profile/sessions/${session.id}`);
            await loadSessions();
        } catch (e) {
            setError(t('Не удалось завершить сессию'));
        } finally {
            setIsMutating(false);
        }
    }, [dispatch, loadSessions, t]);

    const revokeOtherSessions = useCallback(async () => {
        setIsMutating(true);
        setError(null);
        try {
            await $apiPrivate.delete('/profile/sessions');
            await loadSessions();
        } catch (e) {
            setError(t('Не удалось завершить другие сессии'));
        } finally {
            setIsMutating(false);
        }
    }, [loadSessions, t]);

    return (
        <section className={cls.ActiveSessions}>
            <div className={cls.header}>
                <div>
                    <h3 className={cls.title}>{t('Активные сессии')}</h3>
                    <p className={cls.hint}>
                        {t('Проверьте устройства, где открыт ваш аккаунт.')}
                    </p>
                </div>
                <Button
                    theme={ButtonTheme.OUTLINE_RED}
                    disabled={isLoading || isMutating || otherSessionsCount === 0}
                    onClick={revokeOtherSessions}
                >
                    {t('Завершить остальные')}
                </Button>
            </div>

            {error && (
                <StateView
                    className={cls.state}
                    tone="error"
                    title={error}
                    text={t('Попробуйте обновить список сессий чуть позже.')}
                />
            )}

            <div className={cls.list}>
                {sessions.map((session) => (
                    <div className={cls.session} key={session.id}>
                        <div>
                            <div className={cls.sessionTitle}>
                                <span>{formatDevice(session.userAgent)}</span>
                                {session.isCurrent && <span className={cls.badge}>{t('Текущая')}</span>}
                            </div>
                            <div className={cls.meta}>
                                <span>IP: {session.ipAddress || '—'}</span>
                                <span>{t('Последняя активность')}: {formatDate(session.lastUsedAt)}</span>
                                <span>{t('Создана')}: {formatDate(session.createdAt)}</span>
                                <span>{t('Истекает')}: {formatDate(session.expiresAt)}</span>
                            </div>
                        </div>

                        <Button
                            theme={ButtonTheme.OUTLINE_RED}
                            disabled={isMutating}
                            onClick={() => revokeSession(session)}
                        >
                            {session.isCurrent ? t('Выйти здесь') : t('Завершить')}
                        </Button>
                    </div>
                ))}
                {!isLoading && sessions.length === 0 && (
                    <StateView
                        variant="inline"
                        title={t('Активных сессий не найдено')}
                        text={t('Когда вы войдёте с другого устройства, оно появится здесь.')}
                    />
                )}
                {isLoading && <ListSkeleton rows={2} height={86} />}
            </div>
        </section>
    );
});
