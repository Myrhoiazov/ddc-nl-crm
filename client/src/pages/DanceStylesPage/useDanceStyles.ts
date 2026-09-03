import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router-dom';
import { $apiPrivate } from '@/shared/api/api';

export interface DanceStyle {
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

export type Lang = 'ru' | 'ua' | 'en';
export type StyleForm = Omit<DanceStyle, 'id'>;

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

export const langFields = {
    ru: { name: 'name', description: 'description', content: 'content', label: 'RU' },
    ua: { name: 'nameUa', description: 'descriptionUa', content: 'contentUa', label: 'UA' },
    en: { name: 'nameEn', description: 'descriptionEn', content: 'contentEn', label: 'EN' },
} as const;

export const useDanceStyles = () => {
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

    const resetFilters = () => {
        setSearch('');
        setStatus('all');
        setSort('name-asc');
    };

    return {
        items,
        search,
        setSearch,
        status,
        setStatus,
        sort,
        setSort,
        loading,
        modalOpen,
        setModalOpen,
        editingId,
        lang,
        setLang,
        form,
        saving,
        openCreate,
        openEdit,
        updateField,
        uploadImage,
        save,
        remove,
        toggle,
        resetFilters,
    };
};
