import { FormEvent, memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SeatCategory } from '@/entities/TicketSeatMap';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import s from './TicketingEventsPage.module.scss';
import { fetchSeatMapCategories, type NewSession, type SeatMapOption } from './ticketingEventsApi';
import { localInputToIso, parsePriceToCents } from './ticketingFormat';

type PriceInputs = Record<number, string>;

// Собирает тело запроса; null — форма ещё не заполнена корректно.
const buildSession = (form: { seatMapId: string; startsAt: string; prices: PriceInputs }, categories: SeatCategory[]): NewSession | null => {
    const startsAt = localInputToIso(form.startsAt);
    const prices = categories.map((category) => ({
        categoryId: category.id,
        priceCents: parsePriceToCents(form.prices[category.id] ?? ''),
    }));
    if (!form.seatMapId || !startsAt || categories.length === 0) return null;
    if (prices.some((price) => price.priceCents === null)) return null;
    return { seatMapId: Number(form.seatMapId), startsAt, prices: prices as NewSession['prices'] };
};

const useSeatMapCategories = (seatMapId: string) => {
    const [categories, setCategories] = useState<SeatCategory[]>([]);

    useEffect(() => {
        setCategories([]);
        if (!seatMapId) return;
        fetchSeatMapCategories(Number(seatMapId)).then(setCategories).catch(() => setCategories([]));
    }, [seatMapId]);

    return categories;
};

interface SessionFormFieldsProps {
    seatMaps: SeatMapOption[];
    categories: SeatCategory[];
    values: { seatMapId: string; startsAt: string; prices: PriceInputs };
    onSeatMapChange: (seatMapId: string) => void;
    onStartsAtChange: (value: string) => void;
    onPriceChange: (categoryId: number, value: string) => void;
}

const SessionFormFields = memo((props: SessionFormFieldsProps) => {
    const { seatMaps, categories, values, onSeatMapChange, onStartsAtChange, onPriceChange } = props;
    const { t } = useTranslation();

    return (
        <>
            <div className={s.formRow}>
                <Select
                    label={t('Схема зала')}
                    defaultValue={t('Выберите схему')}
                    value={values.seatMapId}
                    onChange={onSeatMapChange}
                    options={seatMaps.map((seatMap) => ({ value: String(seatMap.id), content: seatMap.label }))}
                />
                <label className={s.field}>
                    <span className={s.fieldLabel}>{t('Дата и время начала')}</span>
                    <input
                        className={s.dateInput}
                        type="datetime-local"
                        value={values.startsAt}
                        onChange={(event) => onStartsAtChange(event.target.value)}
                    />
                </label>
            </div>
            <div className={s.formRow}>
                {categories.map((category) => (
                    <Input
                        key={category.id}
                        label={`${category.name}, €`}
                        value={values.prices[category.id] ?? ''}
                        onChange={(value) => onPriceChange(category.id, value)}
                        fullWidth
                    />
                ))}
            </div>
        </>
    );
});

interface SessionFormProps {
    seatMaps: SeatMapOption[];
    onSubmit: (session: NewSession) => Promise<boolean>;
}

export const SessionForm = memo(({ seatMaps, onSubmit }: SessionFormProps) => {
    const { t } = useTranslation();
    const [seatMapId, setSeatMapId] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [prices, setPrices] = useState<PriceInputs>({});
    const [isSaving, setIsSaving] = useState(false);
    const categories = useSeatMapCategories(seatMapId);
    const session = buildSession({ seatMapId, startsAt, prices }, categories);
    const changePrice = useCallback((categoryId: number, value: string) => {
        setPrices((current) => ({ ...current, [categoryId]: value }));
    }, []);

    const handleSubmit = useCallback(async (event: FormEvent) => {
        event.preventDefault();
        if (!session) return;
        setIsSaving(true);
        await onSubmit(session);
        setIsSaving(false);
    }, [onSubmit, session]);

    if (seatMaps.length === 0) {
        return <span className={s.muted}>{t('Сначала опубликуйте схему зала в разделе «Залы».')}</span>;
    }

    return (
        <form className={s.sessionForm} onSubmit={handleSubmit}>
            <SessionFormFields
                seatMaps={seatMaps}
                categories={categories}
                values={{ seatMapId, startsAt, prices }}
                onSeatMapChange={setSeatMapId}
                onStartsAtChange={setStartsAt}
                onPriceChange={changePrice}
            />
            <Button type="submit" theme={ButtonTheme.BACKGROUND} disabled={isSaving || !session}>
                {t('Создать сеанс')}
            </Button>
        </form>
    );
});
