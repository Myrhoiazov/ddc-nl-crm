import { ChangeEvent, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { Modal } from '@/shared/ui/Modal/Modal';
import { $apiPrivate } from '@/shared/api/api';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router-dom';
import { getStyleColorSlot } from '@/shared/lib/styleColor/styleColor';
import s from './DanceStylesPage.module.scss';

interface DanceStyle {
    id: number;
    name: string;
    nameUa?: string;
    nameEn?: string;
    description?: string;
    descriptionUa?: string;
    descriptionEn?: string;
    content?: string;
    contentUa?: string;
    contentEn?: string;
    image?: string;
    youtubeUrl?: string;
    isActive: boolean;
}

type Lang = 'ru' | 'ua' | 'en';
type StyleForm = Omit<DanceStyle, 'id'>;

const emptyForm: StyleForm = {
    name: '',
    nameUa: '',
    nameEn: '',
    description: '',
    descriptionUa: '',
    descriptionEn: '',
    content: '',
    contentUa: '',
    contentEn: '',
    image: '',
    youtubeUrl: '',
    isActive: true,
};

const langFields = {
    ru: { name: 'name', description: 'description', content: 'content', label: 'RU' },
    ua: { name: 'nameUa', description: 'descriptionUa', content: 'contentUa', label: 'UA' },
    en: { name: 'nameEn', description: 'descriptionEn', content: 'contentEn', label: 'EN' },
} as const;

const DanceStylesPage = memo(() => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [items, setItems] = useState<DanceStyle[]>([]);
    const [search, setSearch] = useState(searchParams.get('_q') ?? '');
    const [status, setStatus] = useState('all');
    const [sort, setSort] = useState('name-asc');
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number>();
    const [lang, setLang] = useState<Lang>('ru');
    const [form, setForm] = useState<StyleForm>(emptyForm);
    const [saving, setSaving] = useState(false);

    const loadStyles = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await $apiPrivate.get<{ items: DanceStyle[] }>('/schedule/style-cards', {
                params: { _q: search, status, sort },
            });
            setItems(data.items);
        } catch {
            toast.error('Не удалось загрузить стили');
        } finally {
            setLoading(false);
        }
    }, [search, status, sort]);

    useEffect(() => {
        const timer = window.setTimeout(loadStyles, 250);
        return () => window.clearTimeout(timer);
    }, [loadStyles]);

    useEffect(() => {
        setSearch(searchParams.get('_q') ?? '');
    }, [searchParams]);

    const openCreate = () => {
        setEditingId(undefined);
        setForm(emptyForm);
        setLang('ru');
        setModalOpen(true);
    };

    const openEdit = (item: DanceStyle) => {
        setEditingId(item.id);
        setForm({ ...emptyForm, ...item });
        setLang('ru');
        setModalOpen(true);
    };

    const updateField = (field: keyof StyleForm, value: string | boolean) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const data = new FormData();
        data.append('file', file);
        try {
            const response = await $apiPrivate.post<{ url: string }>('/schedule/style-cards/upload', data);
            updateField('image', response.data.url);
        } catch {
            toast.error('Не удалось загрузить фото');
        }
    };

    const save = async () => {
        if (!form.name.trim()) {
            toast.error('Укажите название на русском');
            return;
        }
        setSaving(true);
        try {
            if (editingId) await $apiPrivate.put(`/schedule/style-cards/${editingId}`, form);
            else await $apiPrivate.post('/schedule/style-cards', form);
            toast.success(editingId ? 'Стиль обновлён' : 'Стиль добавлен');
            setModalOpen(false);
            loadStyles();
        } catch {
            toast.error('Не удалось сохранить стиль');
        } finally {
            setSaving(false);
        }
    };

    const remove = async (item: DanceStyle) => {
        if (!window.confirm(`Удалить стиль «${item.name}»?`)) return;
        try {
            await $apiPrivate.delete(`/schedule/style-cards/${item.id}`);
            toast.success('Стиль удалён');
            loadStyles();
        } catch {
            toast.error('Не удалось удалить стиль');
        }
    };

    const toggle = async (item: DanceStyle) => {
        await $apiPrivate.put(`/schedule/style-cards/${item.id}`, { ...item, isActive: !item.isActive });
        loadStyles();
    };

    const fields = langFields[lang];
    const shown = useMemo(() => `${items.length}`, [items.length]);

    return (
        <Page>
            <div className={s.header}>
                <h1>{t('Стили / направления')}</h1>
                <button className={s.cta} onClick={openCreate}>{t('+ Добавить стиль')}</button>
            </div>

            <section className={s.filters}>
                <label>{t('Поиск')}<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="По названию или описанию" /></label>
                <label>{t('Статус')}<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">{t('Все')}</option><option value="active">{t('Включены')}</option><option value="inactive">{t('Выключены')}</option></select></label>
                <label>{t('Сортировка')}<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="name-asc">{t('По алфавиту: А → Я')}</option><option value="name-desc">{t('По алфавиту: Я → А')}</option><option value="newest">{t('Сначала новые')}</option></select></label>
                <button className={s.reset} onClick={() => { setSearch(''); setStatus('all'); setSort('name-asc'); }}>{t('Сбросить')}</button>
                <span className={s.count}>{t('Показано: {{shown}}', { shown })}</span>
            </section>

            {loading ? <div className={s.empty}>Загружаем стили...</div> : !items.length ? <div className={s.empty}>{t('Стили пока не добавлены.')}</div> : (
                <div className={s.grid}>
                    {items.map((item) => (
                        <article className={s.card} key={item.id}>
                            <div className={s.photo}>{item.image ? <img src={item.image} alt={item.name} /> : <span>{t('Нет фото')}</span>}</div>
                            <div className={s.cardTitle}><span className={`${s.swatch} ${s[`style${getStyleColorSlot(item.name)}`]}`} title="Цвет в расписании" /><h2>{item.name}</h2><button className={`${s.switch} ${item.isActive ? s.on : ''}`} onClick={() => toggle(item)}><span /></button><small>{item.isActive ? 'Вкл' : 'Выкл'}</small></div>
                            <p>{item.description || 'Описание пока не добавлено.'}</p>
                            {item.content && <p>{item.content}</p>}
                            {item.youtubeUrl && <a href={item.youtubeUrl} target="_blank" rel="noreferrer">{t('YouTube')}</a>}
                            <div className={s.actions}>
                                {item.youtubeUrl && <a className={s.iconBtn} href={item.youtubeUrl} target="_blank" rel="noreferrer">↗</a>}
                                <button className={s.iconBtn} onClick={() => openEdit(item)}>{t('✎')}</button>
                                <button className={`${s.iconBtn} ${s.delete}`} onClick={() => remove(item)}>{t('⌫')}</button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} lazy>
                <div className={s.form}>
                    <h2>{editingId ? 'Редактировать стиль' : 'Добавить стиль'}</h2>
                    <div className={s.tabs}>{(['ua', 'ru', 'en'] as Lang[]).map((code) => <button key={code} className={lang === code ? s.activeTab : ''} onClick={() => setLang(code)}>{langFields[code].label}</button>)}</div>
                    <label>{t('Название (')}{fields.label}) {lang === 'ru' && '*'}<input value={String(form[fields.name] ?? '')} onChange={(e) => updateField(fields.name, e.target.value)} placeholder={`${fields.label}: Например Jazz Funk`} /></label>
                    <label>{t('Описание (')}{fields.label})<textarea rows={3} value={String(form[fields.description] ?? '')} onChange={(e) => updateField(fields.description, e.target.value)} placeholder="Краткое описание направления для карточки" /></label>
                    <label>{t('Подробное описание (')}{fields.label})<textarea className={s.editor} rows={8} value={String(form[fields.content] ?? '')} onChange={(e) => updateField(fields.content, e.target.value)} placeholder="Подробное описание стиля" /></label>
                    <label>{t('Фото')}<input type="file" accept="image/*" onChange={uploadImage} /></label>
                    {form.image && <img className={s.preview} src={form.image} alt="" />}
                    <label>{t('Ссылка на YouTube')}<input value={form.youtubeUrl} onChange={(e) => updateField('youtubeUrl', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label>
                    <label className={s.toggleLabel}><button className={`${s.switch} ${form.isActive ? s.on : ''}`} onClick={() => updateField('isActive', !form.isActive)}><span /></button>{form.isActive ? 'Включен' : 'Выключен'}</label>
                    <div className={s.formActions}><button className={s.reset} onClick={() => setModalOpen(false)}>{t('Закрыть')}</button><button className={s.cta} onClick={save} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить стиль'}</button></div>
                </div>
            </Modal>
        </Page>
    );
});

export default DanceStylesPage;
