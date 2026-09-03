import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Choreographer, GroupLevel, Branch } from '@/entities/DanceGroup';
import s from './CreateGroupModal.module.scss';

const LEVELS: GroupLevel[] = ['START', 'FAN', 'PRO'];
const LEVEL_LABELS: Record<GroupLevel, string> = { START: 'Start', FAN: 'Fan', PRO: 'Pro' };

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

export const CreateGroupModalFields = memo((props: CreateGroupModalFieldsProps) => {
    const {
        name, setName, choreographerId, setChoreographerId, choreographers,
        style, setStyle, styles, branchId, setBranchId, branches,
        level, setLevel, maxParticipants, setMaxParticipants, lessonPrice, setLessonPrice,
    } = props;
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>

            <div className={s.field}>
                <label className={s.label}>
                    {t('Хореограф')} <span className={s.req}>*</span>
                </label>
                <select
                    className={s.select}
                    value={choreographerId}
                    onChange={(e) => setChoreographerId(e.target.value)}
                >
                    <option value="">{t('Выберите хореографа')}</option>
                    {choreographers.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.firstName} {c.lastName}
                        </option>
                    ))}
                </select>
            </div>

            <div className={s.field}>
                <label className={s.label}>
                    {t('Стиль')} <span className={s.req}>*</span>
                </label>
                <select
                    className={s.select}
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                >
                    <option value="">{t('Выберите стиль')}</option>
                    {styles.map((styleName) => (
                        <option key={styleName} value={styleName}>
                            {styleName}
                        </option>
                    ))}
                </select>
            </div>

            <div className={s.field}>
                <label className={s.label}>
                    {t('Филиал')} <span className={s.req}>*</span>
                </label>
                <select
                    className={s.select}
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                >
                    <option value="">{t('Выберите филиал')}</option>
                    {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.name}
                            {b.city ? ` · ${b.city}` : ''}
                        </option>
                    ))}
                </select>
            </div>

            <div className={s.row}>
                <div className={s.field}>
                    <label className={s.label}>
                        {t('Уровень группы')} <span className={s.req}>*</span>
                    </label>
                    <div className={s.levelGroup}>
                        {LEVELS.map((l) => (
                            <button
                                key={l}
                                type="button"
                                className={classNames(s.levelBtn, {
                                    [s.levelActive]: level === l,
                                })}
                                onClick={() => setLevel(l)}
                            >
                                {LEVEL_LABELS[l]}
                            </button>
                        ))}
                    </div>
                </div>
                <div className={s.field}>
                    <label className={s.label}>{t('Макс. участников')}</label>
                    <input
                        className={s.inputSmall}
                        type="number"
                        min={1}
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    />
                </div>
                <div className={s.field}>
                    <label className={s.label}>{t('Стоимость занятия, EUR')}</label>
                    <input
                        className={s.inputSmall}
                        type="number"
                        min={0}
                        step="0.01"
                        value={lessonPrice}
                        onChange={(e) => setLessonPrice(e.target.value)}
                    />
                </div>
            </div>
        </>
    );
});
