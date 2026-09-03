import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Choreographer, ChoreographerCategory } from '../ChoreographerCard/ChoreographerCard';

export type Lang = 'RU' | 'UA' | 'EN';
export const LANGS: Lang[] = ['RU', 'UA', 'EN'];
export const CATEGORIES: ChoreographerCategory[] = ['START', 'FAN', 'PRO'];
export const CATEGORY_LABELS: Record<ChoreographerCategory, string> = { START: 'Start', FAN: 'Fan', PRO: 'Pro' };

declare const __API__: string;

export function toAbsUrl(url: string | null | undefined) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${__API__}${url}`;
}

interface UseChoreographerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editChoreographer?: Choreographer | null;
}

export interface UseChoreographerModalResult {
    editChoreographer?: Choreographer | null;
    saving: boolean;
    lang: Lang;
    setLang: (value: Lang) => void;
    firstNameValue: string;
    lastNameValue: string;
    setFirstName: (value: string) => void;
    setLastName: (value: string) => void;
    photo: string | null;
    setPhoto: (value: string | null) => void;
    mainPhoto: string | null;
    setMainPhoto: (value: string | null) => void;
    additionalPhotos: string[];
    removeExtra: (index: number) => void;
    uploadingPhoto: boolean;
    uploadingMain: boolean;
    uploadingExtra: boolean;
    avatarInputRef: React.RefObject<HTMLInputElement | null>;
    mainInputRef: React.RefObject<HTMLInputElement | null>;
    extraInputRef: React.RefObject<HTMLInputElement | null>;
    onAvatarChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onMainChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onExtraChange: (e: ChangeEvent<HTMLInputElement>) => void;
    phone: string;
    setPhone: (value: string) => void;
    birthday: string;
    setBirthday: (value: string) => void;
    email: string;
    setEmail: (value: string) => void;
    experience: string;
    setExperience: (value: string) => void;
    category: ChoreographerCategory | '';
    setCategory: (value: ChoreographerCategory | '') => void;
    showOnSite: boolean;
    setShowOnSite: (value: boolean) => void;
    description: string;
    setDescription: (value: string) => void;
    templateDescription: string;
    setTemplateDescription: (value: string) => void;
    firstNameRu: string;
    lastNameRu: string;
    onSubmit: () => void;
}

export const useChoreographerModal = ({ isOpen, onClose, onSaved, editChoreographer }: UseChoreographerModalProps): UseChoreographerModalResult => {
    const [lang, setLang] = useState<Lang>('RU');
    const [saving, setSaving] = useState(false);

    const [firstNameRu, setFirstNameRu] = useState('');
    const [lastNameRu, setLastNameRu] = useState('');
    const [firstNameUa, setFirstNameUa] = useState('');
    const [lastNameUa, setLastNameUa] = useState('');
    const [firstNameEn, setFirstNameEn] = useState('');
    const [lastNameEn, setLastNameEn] = useState('');

    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [birthday, setBirthday] = useState('');
    const [experience, setExperience] = useState('');
    const [category, setCategory] = useState<ChoreographerCategory | ''>('');
    const [showOnSite, setShowOnSite] = useState(true);
    const [description, setDescription] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');

    const [photo, setPhoto] = useState<string | null>(null);
    const [mainPhoto, setMainPhoto] = useState<string | null>(null);
    const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [uploadingMain, setUploadingMain] = useState(false);
    const [uploadingExtra, setUploadingExtra] = useState(false);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const mainInputRef = useRef<HTMLInputElement>(null);
    const extraInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        if (editChoreographer) {
            const c = editChoreographer;
            setFirstNameRu(c.firstName); setLastNameRu(c.lastName);
            setFirstNameUa(c.firstNameUa ?? ''); setLastNameUa(c.lastNameUa ?? '');
            setFirstNameEn(c.firstNameEn ?? ''); setLastNameEn(c.lastNameEn ?? '');
            setPhone(c.phone ?? ''); setEmail(c.email ?? '');
            setBirthday(c.birthday ?? ''); setExperience(c.experience != null ? String(c.experience) : '');
            setCategory(c.category ?? ''); setShowOnSite(c.showOnSite);
            setDescription(c.description ?? ''); setTemplateDescription(c.templateDescription ?? '');
            setPhoto(c.photo ?? null); setMainPhoto(c.mainPhoto ?? null);
            try { setAdditionalPhotos(c.additionalPhotos ? JSON.parse(c.additionalPhotos) : []); }
            catch { setAdditionalPhotos([]); }
        } else {
            setFirstNameRu(''); setLastNameRu('');
            setFirstNameUa(''); setLastNameUa('');
            setFirstNameEn(''); setLastNameEn('');
            setPhone(''); setEmail(''); setBirthday(''); setExperience('');
            setCategory(''); setShowOnSite(true);
            setDescription(''); setTemplateDescription('');
            setPhoto(null); setMainPhoto(null); setAdditionalPhotos([]);
        }
        setLang('RU');
    }, [isOpen, editChoreographer]);

    const uploadFile = useCallback(async (file: File): Promise<string | null> => {
        const form = new FormData();
        form.append('file', file);
        try {
            const res = await $apiPrivate.post<{ url: string }>('/schedule/choreographers/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data.url;
        } catch {
            toast.error('Ошибка загрузки фото');
            return null;
        }
    }, []);

    const handleAvatarChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingPhoto(true);
        const url = await uploadFile(file);
        if (url) setPhoto(url);
        setUploadingPhoto(false);
        e.target.value = '';
    }, [uploadFile]);

    const handleMainChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingMain(true);
        const url = await uploadFile(file);
        if (url) setMainPhoto(url);
        setUploadingMain(false);
        e.target.value = '';
    }, [uploadFile]);

    const handleExtraChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        if (additionalPhotos.length >= 5) { toast.warn('Максимум 5 фото'); return; }
        setUploadingExtra(true);
        const file = e.target.files[0];
        const url = await uploadFile(file);
        if (url) setAdditionalPhotos((prev) => [...prev, url]);
        setUploadingExtra(false);
        e.target.value = '';
    }, [additionalPhotos.length, uploadFile]);

    const removeExtra = useCallback((idx: number) => setAdditionalPhotos((prev) => prev.filter((_, i) => i !== idx)), []);

    const onSubmit = useCallback(async () => {
        if (!firstNameRu || !lastNameRu) {
            toast.error('Укажите имя и фамилию (RU)');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                firstName: firstNameRu, lastName: lastNameRu,
                firstNameUa: firstNameUa || null, lastNameUa: lastNameUa || null,
                firstNameEn: firstNameEn || null, lastNameEn: lastNameEn || null,
                phone: phone || null, email: email || null,
                birthday: birthday || null,
                experience: experience ? Number(experience) : null,
                category: category || null,
                photo, mainPhoto,
                additionalPhotos: additionalPhotos.length ? additionalPhotos : null,
                description: description || null,
                templateDescription: templateDescription || null,
                showOnSite,
            };
            if (editChoreographer) {
                await $apiPrivate.put(`/schedule/choreographers/${editChoreographer.id}`, payload);
                toast.success('Хореограф обновлён');
            } else {
                await $apiPrivate.post('/schedule/choreographers', payload);
                toast.success('Хореограф создан');
            }
            onSaved();
            onClose();
        } catch {
            toast.error('Не удалось сохранить');
        } finally {
            setSaving(false);
        }
    }, [
        firstNameRu, lastNameRu, firstNameUa, lastNameUa, firstNameEn, lastNameEn,
        phone, email, birthday, experience, category, photo, mainPhoto,
        additionalPhotos, description, templateDescription, showOnSite,
        editChoreographer, onSaved, onClose,
    ]);

    const firstNameValue = lang === 'RU' ? firstNameRu : lang === 'UA' ? firstNameUa : firstNameEn;
    const lastNameValue = lang === 'RU' ? lastNameRu : lang === 'UA' ? lastNameUa : lastNameEn;
    const setFirstName = lang === 'RU' ? setFirstNameRu : lang === 'UA' ? setFirstNameUa : setFirstNameEn;
    const setLastName = lang === 'RU' ? setLastNameRu : lang === 'UA' ? setLastNameUa : setLastNameEn;

    return {
        editChoreographer,
        saving,
        lang, setLang,
        firstNameValue, lastNameValue,
        setFirstName, setLastName,
        photo, setPhoto,
        mainPhoto, setMainPhoto,
        additionalPhotos, removeExtra,
        uploadingPhoto, uploadingMain, uploadingExtra,
        avatarInputRef, mainInputRef, extraInputRef,
        onAvatarChange: handleAvatarChange,
        onMainChange: handleMainChange,
        onExtraChange: handleExtraChange,
        phone, setPhone,
        birthday, setBirthday,
        email, setEmail,
        experience, setExperience,
        category, setCategory,
        showOnSite, setShowOnSite,
        description, setDescription,
        templateDescription, setTemplateDescription,
        firstNameRu, lastNameRu,
        onSubmit,
    };
};
