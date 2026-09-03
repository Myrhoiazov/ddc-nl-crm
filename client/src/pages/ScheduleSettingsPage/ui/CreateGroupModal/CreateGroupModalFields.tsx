import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Choreographer, GroupLevel, Branch } from '@/entities/DanceGroup';
import { SelectField, NumberField, LevelButtons } from './FormField';
import s from './CreateGroupModal.module.scss';

const LEVELS: { value: GroupLevel; label: string }[] = [
    { value: 'START', label: 'Start' },
    { value: 'FAN', label: 'Fan' },
    { value: 'PRO', label: 'Pro' },
];

interface CreateGroupModalFieldsProps {
    name: string;
    setName: (value: string) => void;
    choreographerId: string;
    setChoreographerId: (value: string) => void;
    choreographers: Choreographer[];
    style: string;
    setStyle: (value: string) => void;
    styles: string[];
    branchId: string;
    setBranchId: (value: string) => void;
    branches: Branch[];
    level: GroupLevel;
    setLevel: (level: GroupLevel) => void;
    maxParticipants: number;
    setMaxParticipants: (value: number) => void;
    lessonPrice: string;
    setLessonPrice: (value: string) => void;
}

export const CreateGroupModalFields = memo(function CreateGroupModalFields(
    props: CreateGroupModalFieldsProps,
) {
    const { t } = useTranslation();

    return (
        <>
            <div className={s.field}>
                <label className={s.label}>
                    {t('Название группы')} <span className={s.req}>*</span>
                </label>
                <input
                    className={s.input}
                    placeholder="Break dance 6-10 років"
                    value={props.name}
                    onChange={(e) => props.setName(e.target.value)}
                />
            </div>

            <SelectField
                label="Хореограф"
                required
                value={props.choreographerId}
                onChange={props.setChoreographerId}
                placeholder="Выберите хореографа"
            >
                {props.choreographers.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                    </option>
                ))}
            </SelectField>

            <SelectField
                label="Стиль"
                required
                value={props.style}
                onChange={props.setStyle}
                placeholder="Выберите стиль"
            >
                {props.styles.map((styleName) => (
                    <option key={styleName} value={styleName}>
                        {styleName}
                    </option>
                ))}
            </SelectField>

            <SelectField
                label="Филиал"
                required
                value={props.branchId}
                onChange={props.setBranchId}
                placeholder="Выберите филиал"
            >
                {props.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                        {b.name}
                        {b.city ? ` · ${b.city}` : ''}
                    </option>
                ))}
            </SelectField>

            <div className={s.row}>
                <div className={s.field}>
                    <label className={s.label}>
                        {t('Уровень группы')} <span className={s.req}>*</span>
                    </label>
                    <LevelButtons levels={LEVELS} level={props.level} setLevel={props.setLevel} />
                </div>
                <NumberField
                    label="Макс. участников"
                    value={props.maxParticipants}
                    min={1}
                    onChange={(value) => props.setMaxParticipants(Number(value))}
                />
                <NumberField
                    label="Стоимость занятия, EUR"
                    value={props.lessonPrice}
                    min={0}
                    step="0.01"
                    onChange={props.setLessonPrice}
                />
            </div>
        </>
    );
});
