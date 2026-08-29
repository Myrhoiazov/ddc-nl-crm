import { memo, useState, useEffect } from 'react';
import { Modal } from '@/shared/ui/Modal/Modal';
import { $apiPrivate } from '@/shared/api/api';
import type { DanceGroup } from '@/entities/DanceGroup';
import { Choreographer, GroupLevel, ScheduleSlot, Branch } from '@/entities/DanceGroup';

import { classNames } from '@/shared/lib/classNames/classNames';
import s from './CreateGroupModal.module.scss';
import { toast } from 'react-toastify';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editGroup?: DanceGroup | null;
}

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const LEVELS: GroupLevel[] = ['START', 'FAN', 'PRO'];
const LEVEL_LABELS: Record<GroupLevel, string> = { START: 'Start', FAN: 'Fan', PRO: 'Pro' };

const emptySlot = (): ScheduleSlot => ({ dayOfWeek: 'Понедельник', startTime: '', endTime: '' });

export const CreateGroupModal = memo(
    ({ isOpen, onClose, onSaved, editGroup }: CreateGroupModalProps) => {
        const [name, setName] = useState('');
        const [style, setStyle] = useState('');
        const [level, setLevel] = useState<GroupLevel>('START');
        const [maxParticipants, setMaxParticipants] = useState(20);
        const [lessonPrice, setLessonPrice] = useState('0.00');
        const [choreographerId, setChoreographerId] = useState('');
        const [slots, setSlots] = useState<ScheduleSlot[]>([emptySlot()]);
        const [saving, setSaving] = useState(false);

        const [branchId, setBranchId] = useState('');
        const [choreographers, setChoreographers] = useState<Choreographer[]>([]);
        const [branches, setBranches] = useState<Branch[]>([]);
        const [styles, setStyles] = useState<string[]>([]);

        useEffect(() => {
            if (!isOpen) return;
            Promise.all([
                $apiPrivate.get<Choreographer[]>('/schedule/choreographers'),
                $apiPrivate.get<Branch[]>('/company/branches'),
                $apiPrivate.get<string[]>('/schedule/styles'),
            ]).then(([c, b, st]) => {
                setChoreographers(c.data);
                setBranches(b.data);
                setStyles(st.data);
            });
        }, [isOpen]);

        useEffect(() => {
            if (editGroup) {
                setName(editGroup.name);
                setStyle(editGroup.style);
                setLevel(editGroup.level);
                setMaxParticipants(editGroup.maxParticipants);
                setLessonPrice(((editGroup.lessonPriceCents ?? 0) / 100).toFixed(2));
                setChoreographerId(String(editGroup.choreographerId));
                setBranchId(editGroup.branchId ? String(editGroup.branchId) : '');
                setSlots(editGroup.slots.length ? editGroup.slots : [emptySlot()]);
            } else {
                setName('');
                setStyle('');
                setLevel('START');
                setMaxParticipants(20);
                setLessonPrice('0.00');
                setChoreographerId('');
                setBranchId('');
                setSlots([emptySlot()]);
            }
        }, [editGroup, isOpen]);

        const addSlot = () => setSlots((prev) => [...prev, emptySlot()]);

        const updateSlot = (idx: number, field: keyof ScheduleSlot, value: string) => {
            setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
        };

        const removeSlot = (idx: number) => {
            setSlots((prev) => prev.filter((_, i) => i !== idx));
        };

        const onSubmit = async () => {
            if (!name || !style || !choreographerId || !branchId) {
                toast.error('Заполните все обязательные поля');
                return;
            }

            const parsedLessonPrice = Number(lessonPrice);
            if (!Number.isFinite(parsedLessonPrice) || parsedLessonPrice < 0) {
                toast.error('Укажите корректную стоимость занятия');
                return;
            }

            setSaving(true);
            try {
                const payload = {
                    name,
                    style,
                    level,
                    maxParticipants,
                    lessonPriceCents: Math.round(parsedLessonPrice * 100),
                    choreographerId,
                    branchId,
                    slots,
                };
                if (editGroup) {
                    await $apiPrivate.put(`/schedule/groups/${editGroup.id}`, payload);
                    toast.success('Группа обновлена');
                } else {
                    await $apiPrivate.post('/schedule/groups', payload);
                    toast.success('Группа создана');
                }
                onSaved();
                onClose();
            } catch {
                toast.error('Не удалось сохранить группу');
            } finally {
                setSaving(false);
            }
        };

        return (
            <Modal isOpen={isOpen} onClose={onClose} lazy>
                <div className={s.modal}>
                    <h2 className={s.title}>
                        {editGroup ? 'РЕДАКТИРОВАТЬ ГРУППУ' : 'СОЗДАТЬ ГРУППУ'}
                    </h2>

                    <div className={s.form}>
                        {/* Name */}
                        <div className={s.field}>
                            <label className={s.label}>
                                Название группы <span className={s.req}>*</span>
                            </label>
                            <input
                                className={s.input}
                                placeholder="Break dance 6-10 років"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        {/* Choreographer */}
                        <div className={s.field}>
                            <label className={s.label}>
                                Хореограф <span className={s.req}>*</span>
                            </label>
                            <select
                                className={s.select}
                                value={choreographerId}
                                onChange={(e) => setChoreographerId(e.target.value)}
                            >
                                <option value="">Выберите хореографа</option>
                                {choreographers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.firstName} {c.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Style */}
                        <div className={s.field}>
                            <label className={s.label}>
                                Стиль <span className={s.req}>*</span>
                            </label>
                            <select
                                className={s.select}
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                            >
                                <option value="">Выберите стиль</option>
                                {styles.map((styleName) => (
                                    <option key={styleName} value={styleName}>
                                        {styleName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Branch */}
                        <div className={s.field}>
                            <label className={s.label}>
                                Филиал <span className={s.req}>*</span>
                            </label>
                            <select
                                className={s.select}
                                value={branchId}
                                onChange={(e) => setBranchId(e.target.value)}
                            >
                                <option value="">Выберите филиал</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                        {b.city ? ` · ${b.city}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Level + Max + Price */}
                        <div className={s.row}>
                            <div className={s.field}>
                                <label className={s.label}>
                                    Уровень группы <span className={s.req}>*</span>
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
                                <label className={s.label}>Макс. участников</label>
                                <input
                                    className={s.inputSmall}
                                    type="number"
                                    min={1}
                                    value={maxParticipants}
                                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                                />
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>Стоимость занятия, EUR</label>
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

                        {/* Slots */}
                        <div className={s.slotsBox}>
                            <div className={s.slotsHeader}>
                                <label className={s.label}>
                                    Слоты расписания <span className={s.req}>*</span>
                                </label>
                                <button type="button" className={s.addSlotBtn} onClick={addSlot}>
                                    + Добавить слот
                                </button>
                            </div>
                            {slots.map((slot, idx) => (
                                <div key={idx} className={s.slotRow}>
                                    <select
                                        className={s.daySelect}
                                        value={slot.dayOfWeek}
                                        onChange={(e) =>
                                            updateSlot(idx, 'dayOfWeek', e.target.value)
                                        }
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
                                        onChange={(e) =>
                                            updateSlot(idx, 'startTime', e.target.value)
                                        }
                                    />
                                    <input
                                        className={s.timeInput}
                                        type="time"
                                        value={slot.endTime}
                                        onChange={(e) => updateSlot(idx, 'endTime', e.target.value)}
                                    />
                                    {slots.length > 1 && (
                                        <button
                                            type="button"
                                            className={s.removeSlot}
                                            onClick={() => removeSlot(idx)}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className={s.submitBtn} onClick={onSubmit} disabled={saving}>
                        {saving ? 'Сохранение...' : editGroup ? 'Сохранить' : 'Создать'}
                    </button>
                </div>
            </Modal>
        );
    }
);
