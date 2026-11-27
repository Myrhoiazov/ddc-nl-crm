import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { StateView } from '@/shared/ui/StateView';
import s from './TicketingEventsPage.module.scss';
import { EventCard } from './EventCard';
import { SessionPanel } from './SessionPanel';
import { useTicketingEvents } from './useTicketingEvents';

const CreateEventForm = memo(({ onSubmit }: { onSubmit: (title: string) => Promise<boolean> }) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = useCallback(async (event: FormEvent) => {
        event.preventDefault();
        setIsSaving(true);
        const saved = await onSubmit(title);
        setIsSaving(false);
        if (saved) setTitle('');
    }, [onSubmit, title]);

    return (
        <form className={s.card} onSubmit={handleSubmit}>
            <h2 className={s.cardTitle}>{t('Новое событие')}</h2>
            <Input label={t('Название события')} value={title} onChange={setTitle} fullWidth />
            <Button type="submit" theme={ButtonTheme.BACKGROUND} disabled={isSaving || !title.trim()}>
                {t('Добавить событие')}
            </Button>
        </form>
    );
});

const EventsContent = () => {
    const { t } = useTranslation();
    const page = useTicketingEvents();

    if (page.isLoading) return <Skeleton width="100%" height={240} border="14px" />;
    if (page.loadError) {
        return <StateView tone="error" title={t('Не удалось загрузить события')} text={t('Проверьте соединение с сервером.')} />;
    }

    return (
        <>
            {page.actionError && <span className={s.error}>{t('Не удалось выполнить действие. Попробуйте ещё раз.')}</span>}
            {page.events.length === 0 && <StateView title={t('Событий пока нет')} text={t('Добавьте первое событие ниже.')} />}
            {page.events.map((event) => (
                <EventCard
                    key={event.id}
                    event={event}
                    seatMaps={page.seatMaps}
                    openSessionId={page.session?.id ?? null}
                    onOpenSession={page.openSession}
                    onCreateSession={page.addSession}
                />
            ))}
            {page.session && <SessionPanel session={page.session} onPublish={page.publish} onChangeStatus={page.changeStatus} />}
            <CreateEventForm onSubmit={page.addEvent} />
        </>
    );
};

const TicketingEventsPage = memo(() => {
    const { t } = useTranslation();

    return (
        <Page>
            <VStack max gap="24" className={s.page}>
                <div>
                    <Text title={t('События')} size="l" bold />
                    <Text
                        text={t('Концерты и их сеансы. Сеанс привязан к опубликованной схеме зала; продажа открывается отдельной кнопкой.')}
                        size="s"
                        className={s.subtitle}
                    />
                </div>
                <EventsContent />
            </VStack>
        </Page>
    );
});

export default TicketingEventsPage;
