import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import type { DanceGroup } from '@/entities/DanceGroup';
import { Choreographer, GroupLevel, ScheduleSlot, Branch } from '@/entities/DanceGroup';

export const emptySlot = (): ScheduleSlot => ({ dayOfWeek: 'Понедельник', startTime: '', endTime: '' });

export const useCreateGroupForm = (isOpen: boolean, editGroup: DanceGroup | null | undefined, onSaved: () => void, onClose: () => void) => {
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

    return {
        name, setName,
        style, setStyle,
        level, setLevel,
        maxParticipants, setMaxParticipants,
        lessonPrice, setLessonPrice,
        choreographerId, setChoreographerId,
        slots, addSlot, updateSlot, removeSlot,
        saving,
        branchId, setBranchId,
        choreographers, branches, styles,
        onSubmit,
    };
};
