import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { ChoreographerCategory } from '../ChoreographerCard/ChoreographerCard';
import { CATEGORIES, CATEGORY_LABELS, LANGS, Lang } from './useChoreographerModal';
import s from './ChoreographerModal.module.scss';

interface ChoreographerDetailsFormProps {
    lang: Lang;
    setLang: (value: Lang) => void;
    firstNameValue: string;
    lastNameValue: string;
    setFirstName: (value: string) => void;
    setLastName: (value: string) => void;
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
}

export const ChoreographerDetailsForm = memo((props: ChoreographerDetailsFormProps) => {
    const { t } = useTranslation();
    const {
        lang, setLang,
        firstNameValue, lastNameValue, setFirstName, setLastName,
        phone, setPhone, birthday, setBirthday, email, setEmail,
        experience, setExperience, category, setCategory,
        showOnSite, setShowOnSite,
        description, setDescription, templateDescription, setTemplateDescription,
    } = props;

    return (
        <>
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
                        {t('Имя')} {lang === 'RU' && <span className={s.req}>*</span>} ({lang})
                    </label>
                    <input className={s.input} value={firstNameValue} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className={s.field}>
                    <label className={s.label}>
                        {t('Фамилия')} {lang === 'RU' && <span className={s.req}>*</span>} ({lang})
                    </label>
                    <input className={s.input} value={lastNameValue} onChange={(e) => setLastName(e.target.value)} />
                </div>
            </div>

            {/* Phone + Birthday */}
            <div className={s.row}>
                <div className={s.field}>
                    <label className={s.label}>{t('Телефон')}</label>
                    <input className={s.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+380..." />
                </div>
                <div className={s.field}>
                    <label className={s.label}>{t('Дата рождения')}</label>
                    <input className={s.input} type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
                </div>
            </div>

            {/* Email */}
            <div className={s.field}>
                <label className={s.label}>{t('Email')}</label>
                <input className={s.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mail@example.com" />
            </div>

            {/* Experience */}
            <div className={s.field}>
                <label className={s.label}>{t('Опыт (лет)')}</label>
                <input className={s.inputSmall} type="number" min={0} value={experience} onChange={(e) => setExperience(e.target.value)} />
            </div>

            {/* Category */}
            <div className={s.field}>
                <label className={s.label}>{t('Категория')}</label>
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
                        <button type="button" className={s.clearCat} onClick={() => setCategory('')}>{t('К без категории')}</button>
                    )}
                </div>
            </div>

            {/* Show on site */}
            <div className={s.toggleRow}>
                <label className={s.label}>{t('Показывать на сайте')}</label>
                <label className={s.toggle}>
                    <input type="checkbox" checked={showOnSite} onChange={(e) => setShowOnSite(e.target.checked)} />
                    <span className={s.toggleSlider} />
                </label>
            </div>

            {/* Description */}
            <div className={s.field}>
                <label className={s.label}>{t('Описание')}</label>
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
                <label className={s.label}>{t('Шаблонное описание')}</label>
                <textarea
                    className={s.textarea}
                    rows={4}
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Обладает такими стилями, как: Jazz-Funk..."
                />
            </div>
        </>
    );
});
