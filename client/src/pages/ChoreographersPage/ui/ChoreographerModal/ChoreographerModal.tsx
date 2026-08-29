import { memo, useState, useEffect, useRef, ChangeEvent } from 'react';
import { Modal } from '@/shared/ui/Modal/Modal';
import { $apiPrivate } from '@/shared/api/api';
import { classNames } from '@/shared/lib/classNames/classNames';
import { toast } from 'react-toastify';
import { Choreographer, ChoreographerCategory } from '../ChoreographerCard/ChoreographerCard';
import s from './ChoreographerModal.module.scss';

interface ChoreographerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editChoreographer?: Choreographer | null;
}

type Lang = 'RU' | 'UA' | 'EN';
const LANGS: Lang[] = ['RU', 'UA', 'EN'];
const CATEGORIES: ChoreographerCategory[] = ['START', 'FAN', 'PRO'];
const CATEGORY_LABELS: Record<ChoreographerCategory, string> = { START: 'Start', FAN: 'Fan', PRO: 'Pro' };
declare const __API__: string;

function toAbsUrl(url: string | null | undefined) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${__API__}${url}`;
}

export const ChoreographerModal = memo(({ isOpen, onClose, onSaved, editChoreographer }: ChoreographerModalProps) => {
    const [lang, setLang] = useState<Lang>('RU');
    const [saving, setSaving] = useState(false);

    // Names per language
    const [firstNameRu, setFirstNameRu] = useState('');
    const [lastNameRu, setLastNameRu] = useState('');
    const [firstNameUa, setFirstNameUa] = useState('');
    const [lastNameUa, setLastNameUa] = useState('');
    const [firstNameEn, setFirstNameEn] = useState('');
    const [lastNameEn, setLastNameEn] = useState('');

    // Main fields
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [birthday, setBirthday] = useState('');
    const [experience, setExperience] = useState('');
    const [category, setCategory] = useState<ChoreographerCategory | ''>('');
    const [showOnSite, setShowOnSite] = useState(true);
    const [description, setDescription] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');

    // Photos
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

    const uploadFile = async (file: File): Promise<string | null> => {
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
    };

    const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingPhoto(true);
        const url = await uploadFile(file);
        if (url) setPhoto(url);
        setUploadingPhoto(false);
        e.target.value = '';
    };

    const handleMainChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingMain(true);
        const url = await uploadFile(file);
        if (url) setMainPhoto(url);
        setUploadingMain(false);
        e.target.value = '';
    };

    const handleExtraChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        if (additionalPhotos.length >= 5) { toast.warn('Максимум 5 фото'); return; }
        setUploadingExtra(true);
        const file = e.target.files[0];
        const url = await uploadFile(file);
        if (url) setAdditionalPhotos((prev) => [...prev, url]);
        setUploadingExtra(false);
        e.target.value = '';
    };

    const removeExtra = (idx: number) => setAdditionalPhotos((prev) => prev.filter((_, i) => i !== idx));

    const onSubmit = async () => {
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
    };

    const firstNameValue = lang === 'RU' ? firstNameRu : lang === 'UA' ? firstNameUa : firstNameEn;
    const lastNameValue = lang === 'RU' ? lastNameRu : lang === 'UA' ? lastNameUa : lastNameEn;
    const setFirstName = lang === 'RU' ? setFirstNameRu : lang === 'UA' ? setFirstNameUa : setFirstNameEn;
    const setLastName = lang === 'RU' ? setLastNameRu : lang === 'UA' ? setLastNameUa : setLastNameEn;

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <div className={s.modal}>
                <h2 className={s.title}>
                    {editChoreographer ? 'РЕДАКТИРОВАТЬ ХОРЕОГРАФА' : 'СОЗДАТЬ ХОРЕОГРАФА'}
                </h2>

                {/* Avatar */}
                <div className={s.avatarSection}>
                    <div className={s.avatarWrap}>
                        {photo
                            ? <img className={s.avatar} src={toAbsUrl(photo)!} alt="avatar" />
                            : <div className={s.avatarPlaceholder}>{firstNameRu?.[0] ?? '?'}{lastNameRu?.[0] ?? ''}</div>
                        }
                    </div>
                    <input ref={avatarInputRef} type="file" accept="image/*" className={s.fileInput} onChange={handleAvatarChange} />
                    <button type="button" className={s.uploadBtn} onClick={() => avatarInputRef.current?.click()} disabled={uploadingPhoto}>
                        {uploadingPhoto ? 'Загрузка...' : 'Изменить фото'}
                    </button>
                    <div className={s.uploadHint}>JPG, PNG, WEBP — до 5 МБ</div>
                </div>

                {/* Main photo */}
                <div className={s.mainPhotoSection}>
                    <label className={s.label}>Основное фото для сайта</label>
                    {mainPhoto && (
                        <div className={s.mainPhotoWrap}>
                            <img className={s.mainPhoto} src={toAbsUrl(mainPhoto)!} alt="main" />
                            <button type="button" className={s.removePhotoBtn} onClick={() => setMainPhoto(null)}>Удалить</button>
                        </div>
                    )}
                    <input ref={mainInputRef} type="file" accept="image/*" className={s.fileInput} onChange={handleMainChange} />
                    <button type="button" className={s.uploadBtn} onClick={() => mainInputRef.current?.click()} disabled={uploadingMain}>
                        {uploadingMain ? 'Загрузка...' : 'Изменить основное фото'}
                    </button>
                </div>

                {/* Additional photos */}
                <div className={s.extraSection}>
                    <label className={s.label}>Дополнительные фото (до 5)</label>
                    <div className={s.extraGrid}>
                        {additionalPhotos.map((url, idx) => (
                            <div key={idx} className={s.extraItem}>
                                <img className={s.extraImg} src={toAbsUrl(url)!} alt={`extra-${idx}`} />
                                <button type="button" className={s.removeExtraBtn} onClick={() => removeExtra(idx)}>×</button>
                            </div>
                        ))}
                        {additionalPhotos.length < 5 && (
                            <>
                                <input ref={extraInputRef} type="file" accept="image/*" className={s.fileInput} onChange={handleExtraChange} />
                                <button type="button" className={s.addExtraBtn} onClick={() => extraInputRef.current?.click()} disabled={uploadingExtra}>
                                    {uploadingExtra ? '...' : '+ Добавить фото'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Language tabs */}
                <div className={s.langTabs}>
                    {LANGS.map((l) => (
                        <button
                            key={l}
                            type="button"
                            className={classNames(s.langTab, { [s.langActive]: lang === l })}
                            onClick={() => setLang(l)}
                        >
                            {l}
                        </button>
                    ))}
                </div>

                {/* Name fields */}
                <div className={s.row}>
                    <div className={s.field}>
                        <label className={s.label}>
                            Имя {lang === 'RU' && <span className={s.req}>*</span>} ({lang})
                        </label>
                        <input className={s.input} value={firstNameValue} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div className={s.field}>
                        <label className={s.label}>
                            Фамилия {lang === 'RU' && <span className={s.req}>*</span>} ({lang})
                        </label>
                        <input className={s.input} value={lastNameValue} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                </div>

                {/* Phone + Birthday */}
                <div className={s.row}>
                    <div className={s.field}>
                        <label className={s.label}>Телефон</label>
                        <input className={s.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+380..." />
                    </div>
                    <div className={s.field}>
                        <label className={s.label}>Дата рождения</label>
                        <input className={s.input} type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
                    </div>
                </div>

                {/* Email */}
                <div className={s.field}>
                    <label className={s.label}>Email</label>
                    <input className={s.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mail@example.com" />
                </div>

                {/* Experience */}
                <div className={s.field}>
                    <label className={s.label}>Опыт (лет)</label>
                    <input className={s.inputSmall} type="number" min={0} value={experience} onChange={(e) => setExperience(e.target.value)} />
                </div>

                {/* Category */}
                <div className={s.field}>
                    <label className={s.label}>Категория</label>
                    <div className={s.categoryGroup}>
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                className={classNames(s.categoryBtn, { [s.categoryActive]: category === cat }, [s[`cat_${cat.toLowerCase()}`]])}
                                onClick={() => setCategory(category === cat ? '' : cat)}
                            >
                                {CATEGORY_LABELS[cat]}
                            </button>
                        ))}
                        {category && (
                            <button type="button" className={s.clearCat} onClick={() => setCategory('')}>К без категории</button>
                        )}
                    </div>
                </div>

                {/* Show on site */}
                <div className={s.toggleRow}>
                    <label className={s.label}>Показывать на сайте</label>
                    <label className={s.toggle}>
                        <input type="checkbox" checked={showOnSite} onChange={(e) => setShowOnSite(e.target.checked)} />
                        <span className={s.toggleSlider} />
                    </label>
                </div>

                {/* Description */}
                <div className={s.field}>
                    <label className={s.label}>Описание</label>
                    <textarea
                        className={s.textarea}
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="В своей работе уделяет внимание..."
                    />
                </div>

                {/* Template description */}
                <div className={s.field}>
                    <label className={s.label}>Шаблонное описание</label>
                    <textarea
                        className={s.textarea}
                        rows={4}
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        placeholder="Обладает такими стилями, как: Jazz-Funk..."
                    />
                </div>

                <button className={s.submitBtn} onClick={onSubmit} disabled={saving}>
                    {saving ? 'Сохранение...' : editChoreographer ? 'Сохранить' : 'Создать'}
                </button>
            </div>
        </Modal>
    );
});
