import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScheduleSlot } from '@/entities/DanceGroup';
import s from './CreateGroupModal.module.scss';

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

interface CreateGroupModalSlotsProps {
    slots: ScheduleSlot[];
    onAddSlot: () => void;
    onUpdateSlot: (idx: number, field: keyof ScheduleSlot, value: string) => void;
    onRemoveSlot: (idx: number) => void;
}

export const CreateGroupModalSlots = memo((props: CreateGroupModalSlotsProps) => {
    const { slots, onAddSlot, onUpdateSlot, onRemoveSlot } = props;
    const { t } = useTranslation();

    return (
        <div className={s.slotsBox}>
            <div className={s.slotsHeader}>
                <label className={s.label}>
                    {t('Слоты расписания')} <span className={s.req}>*</span>
                </label>
                <button type="button" className={s.addSlotBtn} onClick={onAddSlot}>
                    {t('+ Добавить слот')}
                </button>
            </div>
            {slots.map((slot, idx) => (
                <div key={idx} className={s.slotRow}>
                    <select
                        className={s.daySelect}
                        value={slot.dayOfWeek}
                        onChange={(e) => onUpdateSlot(idx, 'dayOfWeek', e.target.value)}
                    >
                        {DAYS.map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>
                    <input
                        className={s.timeInput}
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => onUpdateSlot(idx, 'startTime', e.target.value)}
                    />
                    <input
                        className={s.timeInput}
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => onUpdateSlot(idx, 'endTime', e.target.value)}
                    />
                    {slots.length > 1 && (
                        <button
                            type="button"
                            className={s.removeSlot}
                            onClick={() => onRemoveSlot(idx)}
                        >
                            ×
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
});
