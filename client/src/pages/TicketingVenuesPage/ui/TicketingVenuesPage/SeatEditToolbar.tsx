import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SeatCategory } from '@/entities/TicketSeatMap';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import s from './TicketingVenuesPage.module.scss';
import type { SeatChange } from './ticketingVenuesApi';

interface SeatEditToolbarProps {
    selectedCount: number;
    categories: SeatCategory[];
    onApply: (change: SeatChange) => void;
    onClear: () => void;
}

// Действия над выделенными местами черновика. Категория применяется сразу при выборе.
export const SeatEditToolbar = memo(({ selectedCount, categories, onApply, onClear }: SeatEditToolbarProps) => {
    const { t } = useTranslation();
    const isEmpty = selectedCount === 0;

    return (
        <div className={s.seatToolbar}>
            <span className={s.muted} role="status">
                {isEmpty
                    ? t('Нажмите на места на схеме, чтобы сменить их категорию или закрыть для продажи.')
                    : t('Выбрано мест: {{count}}', { count: selectedCount })}
            </span>
            <div className={s.seatToolbarActions}>
                <Select
                    className={s.categorySelect}
                    defaultValue={t('Перенести в категорию')}
                    value=""
                    readonly={isEmpty}
                    onChange={(categoryId) => onApply({ categoryId: Number(categoryId) })}
                    options={categories.map((category) => ({ value: String(category.id), content: category.name }))}
                />
                <Button theme={ButtonTheme.OUTLINE_RED} disabled={isEmpty} onClick={() => onApply({ isDefaultBlocked: true })}>
                    {t('Заблокировать')}
                </Button>
                <Button disabled={isEmpty} onClick={() => onApply({ isDefaultBlocked: false })}>{t('Разблокировать')}</Button>
                <Button disabled={isEmpty} onClick={onClear}>{t('Снять выделение')}</Button>
            </div>
        </div>
    );
});
