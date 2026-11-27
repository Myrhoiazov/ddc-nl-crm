import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import s from './TicketingVenuesPage.module.scss';
import type { NewVenue } from './ticketingVenuesApi';

interface CreateVenueFormProps {
    onSubmit: (venue: NewVenue) => Promise<boolean>;
}

export const CreateVenueForm = memo(({ onSubmit }: CreateVenueFormProps) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = useCallback(async (event: FormEvent) => {
        event.preventDefault();
        setIsSaving(true);
        const saved = await onSubmit({ name, city: city || undefined, address: address || undefined });
        setIsSaving(false);
        if (!saved) return;
        setName('');
        setCity('');
        setAddress('');
    }, [onSubmit, name, city, address]);

    return (
        <form className={s.card} onSubmit={handleSubmit}>
            <h2 className={s.cardTitle}>{t('Новая площадка')}</h2>
            <div className={s.formRow}>
                <Input label={t('Название')} value={name} onChange={setName} fullWidth />
                <Input label={t('Город')} value={city} onChange={setCity} fullWidth />
                <Input label={t('Адрес')} value={address} onChange={setAddress} fullWidth />
            </div>
            <Button type="submit" theme={ButtonTheme.BACKGROUND} disabled={isSaving || !name.trim()}>
                {t('Добавить площадку')}
            </Button>
        </form>
    );
});
