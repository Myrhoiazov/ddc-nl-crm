import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import s from './TicketingVenuesPage.module.scss';
import type { NewSeatMap, SeatBlock } from './ticketingVenuesApi';

const MAX_BLOCKS = 8;
const emptyBlock = (): SeatBlock => ({ categoryName: '', rows: 1, seatsPerRow: 10 });

const toCount = (value: string) => Math.max(1, Math.min(100, Math.floor(Number(value)) || 1));

const countSeats = (blocks: SeatBlock[]) => blocks.reduce((total, block) => total + block.rows * block.seatsPerRow, 0);

const isComplete = (name: string, blocks: SeatBlock[]) => (
    Boolean(name.trim()) && blocks.every((block) => block.categoryName.trim())
);

interface SeatBlockRowProps {
    block: SeatBlock;
    index: number;
    canRemove: boolean;
    onChange: (index: number, patch: Partial<SeatBlock>) => void;
    onRemove: (index: number) => void;
}

const SeatBlockRow = memo(({ block, index, canRemove, onChange, onRemove }: SeatBlockRowProps) => {
    const { t } = useTranslation();

    return (
        <div className={s.blockRow}>
            <Input
                label={t('Категория')}
                value={block.categoryName}
                onChange={(value) => onChange(index, { categoryName: value })}
                fullWidth
            />
            <Input
                label={t('Рядов')}
                type="number"
                value={block.rows}
                onChange={(value) => onChange(index, { rows: toCount(value) })}
            />
            <Input
                label={t('Мест в ряду')}
                type="number"
                value={block.seatsPerRow}
                onChange={(value) => onChange(index, { seatsPerRow: toCount(value) })}
            />
            <Button theme={ButtonTheme.OUTLINE_RED} disabled={!canRemove} onClick={() => onRemove(index)}>
                {t('Убрать')}
            </Button>
        </div>
    );
});

interface SeatMapFormProps {
    onSubmit: (seatMap: NewSeatMap) => Promise<boolean>;
}

export const SeatMapForm = memo(({ onSubmit }: SeatMapFormProps) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [blocks, setBlocks] = useState<SeatBlock[]>([emptyBlock()]);
    const [isSaving, setIsSaving] = useState(false);

    const changeBlock = useCallback((index: number, patch: Partial<SeatBlock>) => {
        setBlocks((current) => current.map((block, i) => (i === index ? { ...block, ...patch } : block)));
    }, []);
    const removeBlock = useCallback((index: number) => {
        setBlocks((current) => current.filter((_, i) => i !== index));
    }, []);

    const handleSubmit = useCallback(async (event: FormEvent) => {
        event.preventDefault();
        setIsSaving(true);
        await onSubmit({ name, blocks });
        setIsSaving(false);
    }, [onSubmit, name, blocks]);

    return (
        <form className={s.seatMapForm} onSubmit={handleSubmit}>
            <Input label={t('Название схемы')} value={name} onChange={setName} fullWidth />
            {blocks.map((block, index) => (
                <SeatBlockRow
                    key={index}
                    block={block}
                    index={index}
                    canRemove={blocks.length > 1}
                    onChange={changeBlock}
                    onRemove={removeBlock}
                />
            ))}
            <div className={s.formActions}>
                <Button disabled={blocks.length >= MAX_BLOCKS} onClick={() => setBlocks((current) => [...current, emptyBlock()])}>
                    {t('Добавить категорию')}
                </Button>
                <span className={s.muted}>{t('Всего мест: {{count}}', { count: countSeats(blocks) })}</span>
                <Button type="submit" theme={ButtonTheme.BACKGROUND} disabled={isSaving || !isComplete(name, blocks)}>
                    {t('Создать схему')}
                </Button>
            </div>
        </form>
    );
});
