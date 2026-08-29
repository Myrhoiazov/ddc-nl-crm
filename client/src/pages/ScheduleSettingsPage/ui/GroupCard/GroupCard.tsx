import { memo } from 'react';
import type { DanceGroup, GroupStatistics, GroupStudent } from '@/entities/DanceGroup';
import { GroupLevel } from '@/entities/DanceGroup';

import { classNames } from '@/shared/lib/classNames/classNames';
import s from './GroupCard.module.scss';

interface GroupCardProps {
    group: DanceGroup;
    statistics?: GroupStatistics;
    onEdit: (group: DanceGroup) => void;
    onDelete: (id: number) => void;
}

const levelLabel: Record<GroupLevel, string> = {
    START: 'Start',
    FAN: 'Fan',
    PRO: 'Pro',
};

const DAY_SHORT: Record<string, string> = {
    Понедельник: 'Пн',
    Вторник: 'Вт',
    Среда: 'Ср',
    Четверг: 'Чт',
    Пятница: 'Пт',
    Суббота: 'Сб',
    Воскресенье: 'Вс',
};

const formatLessonPrice = (lessonPriceCents: number) => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
}).format(lessonPriceCents / 100);

const studentName = (student: GroupStudent) => (
    [student.firstName, student.lastName].filter(Boolean).join(' ') || student.email || `Ученик #${student.id}`
);

export const GroupCard = memo(({ group, statistics, onEdit, onDelete }: GroupCardProps) => {
    const slotsText = group.slots
        .map((s) => `${DAY_SHORT[s.dayOfWeek] ?? s.dayOfWeek} ${s.startTime}–${s.endTime}`)
        .join(', ');

    const choreographerName = [group.choreographer?.firstName, group.choreographer?.lastName]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={s.card}>
            <div className={s.main}>
                <div className={s.titleRow}>
                    <span className={s.name}>{group.name}</span>
                    <span
                        className={classNames(s.badge, {}, [
                            s[`level_${group.level.toLowerCase()}`],
                        ])}
                    >
                        {levelLabel[group.level]}
                    </span>
                </div>
                <div className={s.meta}>
                    {group.style}
                    {choreographerName && <> · {choreographerName}</>}
                </div>
                {slotsText && <div className={s.slots}>{slotsText}</div>}
                <div className={s.hall}>
                    Филиал: {group.branch?.name || 'Не указан'} · {statistics?.activeCount ?? 0}/{group.maxParticipants} активных
                    {statistics?.inactiveCount ? ` · ${statistics.inactiveCount} неактивных` : ''}
                    {' '}· Занятие: {formatLessonPrice(group.lessonPriceCents ?? 0)}
                    {group.branch && (
                        <>
                            {' '}
                            · {group.branch.name}
                            {group.branch.city ? `, ${group.branch.city}` : ''}
                        </>
                    )}
                </div>
                <details className={s.students}>
                    <summary>
                        Ученики ({statistics?.totalCount ?? 0})
                    </summary>
                    <div className={s.studentColumns}>
                        <div>
                            <strong>Активные ({statistics?.activeCount ?? 0})</strong>
                            {statistics?.activeStudents.length ? (
                                <ul>
                                    {statistics.activeStudents.map((student) => (
                                        <li key={student.id}>{studentName(student)}</li>
                                    ))}
                                </ul>
                            ) : <span className={s.noStudents}>Нет учеников</span>}
                        </div>
                        <div>
                            <strong>Неактивные ({statistics?.inactiveCount ?? 0})</strong>
                            {statistics?.inactiveStudents.length ? (
                                <ul>
                                    {statistics.inactiveStudents.map((student) => (
                                        <li key={student.id}>{studentName(student)}</li>
                                    ))}
                                </ul>
                            ) : <span className={s.noStudents}>Нет учеников</span>}
                        </div>
                    </div>
                </details>
            </div>
            <div className={s.actions}>
                <button className={s.editBtn} onClick={() => onEdit(group)} title="Редактировать">
                    ✎
                </button>
                <button className={s.deleteBtn} onClick={() => onDelete(group.id)} title="Удалить">
                    🗑
                </button>
            </div>
        </div>
    );
});
