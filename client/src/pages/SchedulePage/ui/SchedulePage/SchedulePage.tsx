import { Fragment, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Page } from '@/widgets/Page/Page';
import { $apiPrivate } from '@/shared/api/api';
import { DanceGroup, DanceGroupsResponse } from '@/entities/DanceGroup';
import { RoutePath } from '@/shared/config/routeConfig/routeConfig';
import { toast } from 'react-toastify';
import { getStyleColorSlot } from '@/shared/lib/styleColor/styleColor';
import s from './SchedulePage.module.scss';

const DAYS = [
    { key: 'Понедельник', short: 'ПН' },
    { key: 'Вторник', short: 'ВТ' },
    { key: 'Среда', short: 'СР' },
    { key: 'Четверг', short: 'ЧТ' },
    { key: 'Пятница', short: 'ПТ' },
    { key: 'Суббота', short: 'СБ' },
    { key: 'Воскресенье', short: 'ВС' },
];

const startOfWeek = (date: Date) => {
    const result = new Date(date);
    const day = result.getDay() || 7;
    result.setDate(result.getDate() - day + 1);
    result.setHours(0, 0, 0, 0);
    return result;
};

const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const formatShortDate = (date: Date) => date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
const formatDate = (date: Date) => date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const personName = (group: DanceGroup) => `${group.choreographer.firstName} ${group.choreographer.lastName}`;
const levelLabel: Record<DanceGroup['level'], string> = {
    START: 'Start',
    FAN: 'Fan',
    PRO: 'Pro',
};
const searchLink = (path: string, value: string) => `${path}?_q=${encodeURIComponent(value)}`;

const SchedulePage = memo(() => {
    const { t } = useTranslation();
    const [groups, setGroups] = useState<DanceGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const [choreographer, setChoreographer] = useState('');
    const [style, setStyle] = useState('');
    const [branch, setBranch] = useState('');
    const [day, setDay] = useState('');

    const loadGroups = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await $apiPrivate.get<DanceGroupsResponse>('/schedule/groups', {
                params: { page: 1, limit: 500 },
            });
            setGroups(data.data);
        } catch {
            toast.error('Не удалось загрузить расписание');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadGroups(); }, [loadGroups]);

    const options = useMemo(() => ({
        choreographers: Array.from(new Set(groups.map(personName))).sort(),
        styles: Array.from(new Set(groups.map((group) => group.style))).sort(),
        branches: Array.from(new Set(groups.map((group) => group.branch?.name).filter(Boolean) as string[])).sort(),
    }), [groups]);

    const filteredGroups = useMemo(() => groups.filter((group) => (
        (!choreographer || personName(group) === choreographer)
        && (!style || group.style === style)
        && (!branch || group.branch?.name === branch)
        && (!day || group.slots.some((slot) => slot.dayOfWeek === day))
    )), [branch, choreographer, day, groups, style]);

    const times = useMemo(() => Array.from(new Set(
        filteredGroups.flatMap((group) => group.slots.map((slot) => slot.startTime)),
    )).sort(), [filteredGroups]);

    const schedule = useMemo(() => {
        const result = new Map<string, { group: DanceGroup; startTime: string; endTime: string }[]>();
        filteredGroups.forEach((group) => group.slots.forEach((slot) => {
            const key = `${slot.startTime}-${slot.dayOfWeek}`;
            result.set(key, [...(result.get(key) ?? []), { group, startTime: slot.startTime, endTime: slot.endTime }]);
        }));
        return result;
    }, [filteredGroups]);

    const weekDates = useMemo(() => DAYS.map((_, index) => addDays(weekStart, index)), [weekStart]);
    const weekEnd = weekDates[6];

    return (
        <Page>
            <div className={s.header}>
                <h1>{t('Расписание')}</h1>
            </div>

            <section className={s.controls}>
                <div className={s.topControls}>
                    <div className={s.tabs}>
                        <button className={s.activeTab}>{t('Все расписание')}</button>
                        <button>{t('Группы')}</button>
                    </div>
                    <button className={s.navButton} onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</button>
                    <button className={s.todayButton} onClick={() => setWeekStart(startOfWeek(new Date()))}>{t('Сегодня')}</button>
                    <button className={s.navButton} onClick={() => setWeekStart(addDays(weekStart, 7))}>›</button>
                    <span className={s.viewMode}>{t('Неделя')}</span>
                    <Link className={s.addButton} to={RoutePath.schedule_settings}>{t('+ Добавить группу')}</Link>
                </div>
                <div className={s.filters}>
                    <label>{t('Дата')}<input type="date" value={weekStart.toISOString().slice(0, 10)} onChange={(event) => setWeekStart(startOfWeek(new Date(`${event.target.value}T00:00:00`)))} /></label>
                    <label>{t('Хореограф')}<select value={choreographer} onChange={(event) => setChoreographer(event.target.value)}><option value="">{t('Все')}</option>{options.choreographers.map((item) => <option key={item}>{item}</option>)}</select></label>
                    <label>{t('Стиль')}<select value={style} onChange={(event) => setStyle(event.target.value)}><option value="">{t('Все')}</option>{options.styles.map((item) => <option key={item}>{item}</option>)}</select></label>
                    <label>{t('Филиал')}<select value={branch} onChange={(event) => setBranch(event.target.value)}><option value="">{t('Все')}</option>{options.branches.map((item) => <option key={item}>{item}</option>)}</select></label>
                    <label>{t('День недели')}<select value={day} onChange={(event) => setDay(event.target.value)}><option value="">{t('Все дни')}</option>{DAYS.map((item) => <option key={item.key} value={item.key}>{item.key}</option>)}</select></label>
                </div>
            </section>

            <div className={s.summary}>
                <span>{t('Период: {{start}} — {{end}}', { start: formatDate(weekStart), end: formatDate(weekEnd) })}</span>
                <span>{t('Группы: {{count}}', { count: filteredGroups.length })}</span>
                <span>{t('Занятий: {{count}}', { count: filteredGroups.reduce((total, group) => total + group.slots.length, 0) })}</span>
            </div>

            <div className={s.tableWrap}>
                <div className={s.grid}>
                    <div className={`${s.cell} ${s.timeHeader}`}>{t('Время')}</div>
                    {DAYS.map((item, index) => (
                        <div className={`${s.cell} ${s.dayHeader}`} key={item.key}>
                            <strong>{item.short}</strong>
                            <span>{formatShortDate(weekDates[index])}</span>
                        </div>
                    ))}
                    {loading ? <div className={s.loading}>Загружаем расписание...</div> : !times.length ? <div className={s.loading}>{t('В расписании пока нет доступных занятий.')}</div> : times.map((time) => (
                        <Fragment key={time}>
                            <div className={`${s.cell} ${s.timeCell}`} key={`${time}-time`}>{time}</div>
                            {DAYS.map((item) => (
                                <div className={`${s.cell} ${s.scheduleCell}`} key={`${time}-${item.key}`}>
                                    {(schedule.get(`${time}-${item.key}`) ?? []).map(({ group, startTime, endTime }) => (
                                        <article
                                            className={`${s.lesson} ${s[`style${getStyleColorSlot(group.style)}`]}`}
                                            key={`${group.id}-${startTime}-${item.key}`}
                                        >
                                            <div className={s.lessonTitle}><strong>{group.name}</strong><span>{t('Группа')}</span></div>
                                            <b>{startTime}–{endTime}</b>
                                            <p>{t('Стиль: ')}<Link className={s.relationLink} to={searchLink(RoutePath.dance_styles, group.style)}>{group.style}</Link></p>
                                            <p>{t('Хореограф: ')}<Link className={s.relationLink} to={searchLink(RoutePath.choreographers, personName(group))}>{personName(group)}</Link></p>
                                            <p>{t('Уровень: {{level}}', { level: levelLabel[group.level] ?? group.level })}</p>
                                            <p>{t('Филиал: ')}{group.branch ? (
                                                <Link className={s.relationLink} to={searchLink(RoutePath.branches, group.branch.name)}>{group.branch.name}</Link>
                                            ) : 'Не указан'}</p>
                                        </article>
                                    ))}
                                </div>
                            ))}
                        </Fragment>
                    ))}
                </div>
            </div>
        </Page>
    );
});

export default SchedulePage;
