import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { logout } from '@/entities/User';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { SessionItem } from './ActiveSessionItem';
import { fetchSessionsApi, revokeAllSessionsApi, revokeSessionApi } from './sessionsApi';

export const useActiveSessions = () => {
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
            setSessions(await fetchSessionsApi());
        } catch {
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
            await revokeSessionApi(session.id);
            await loadSessions();
        } catch {
            setError(t('Не удалось завершить сессию'));
        } finally {
            setIsMutating(false);
        }
    }, [dispatch, loadSessions, t]);

    const revokeOtherSessions = useCallback(async () => {
        setIsMutating(true);
        setError(null);
        try {
            await revokeAllSessionsApi();
            await loadSessions();
        } catch {
            setError(t('Не удалось завершить другие сессии'));
        } finally {
            setIsMutating(false);
        }
    }, [loadSessions, t]);

    return { sessions, isLoading, isMutating, error, otherSessionsCount, revokeSession, revokeOtherSessions };
};
