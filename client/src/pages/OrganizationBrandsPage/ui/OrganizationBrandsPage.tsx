import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Page } from '@/widgets/Page/Page';
import s from './OrganizationBrandsPage.module.scss';

interface Organization {
    id?: number;
    legalName: string;
    kvkNumber: string;
    vatNumber: string;
    registrationAddress: string;
    postalCode: string;
    city: string;
    countryCode: string;
    email: string;
    phone: string;
    website: string;
    bankName: string;
    iban: string;
    mollieOrganizationId: string;
}

interface Brand {
    id?: number;
    organizationId: number;
    name: string;
    slug: string;
    logoUrl: string;
    primaryColor: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    mollieProfileId: string;
    isDefault: boolean;
    isActive: boolean;
}

const emptyOrganization: Organization = {
    legalName: '', kvkNumber: '', vatNumber: '', registrationAddress: '', postalCode: '', city: '',
    countryCode: 'NL', email: '', phone: '', website: '', bankName: '', iban: '', mollieOrganizationId: '',
};
const emptyBrand = (organizationId = 0): Brand => ({
    organizationId, name: '', slug: '', logoUrl: '', primaryColor: '#1d1d33', email: '', phone: '',
    website: '', address: '', mollieProfileId: '', isDefault: false, isActive: true,
});
const getLogoSrc = (logoUrl: string) => logoUrl.startsWith('/') ? `${__API__}${logoUrl}` : logoUrl;
const textFields: Array<[keyof Organization, string]> = [
    ['legalName', 'Юридическое название *'], ['kvkNumber', 'KVK'], ['vatNumber', 'BTW / VAT'],
    ['registrationAddress', 'Адрес регистрации'], ['postalCode', 'Индекс'], ['city', 'Город'],
    ['countryCode', 'Страна'], ['email', 'Email'], ['phone', 'Телефон'], ['website', 'Сайт'],
    ['bankName', 'Банк'], ['iban', 'IBAN'], ['mollieOrganizationId', 'Mollie organization ID'],
];

const OrganizationBrandsPage = () => {
    const { t } = useTranslation();
    const [organization, setOrganization] = useState<Organization>(emptyOrganization);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [brandForm, setBrandForm] = useState<Brand>(emptyBrand());
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const load = useCallback(async () => {
        const [organizationResponse, brandsResponse] = await Promise.all([
            $apiPrivate.get<Organization | null>('/company/organization'),
            $apiPrivate.get<Brand[]>('/company/brands'),
        ]);
        setOrganization(organizationResponse.data ?? emptyOrganization);
        setBrands(brandsResponse.data);
        setBrandForm(emptyBrand(organizationResponse.data?.id ?? 0));
    }, []);

    useEffect(() => { load(); }, [load]);

    const saveOrganization = async () => {
        setSaving(true);
        try {
            await $apiPrivate.put('/company/organization', organization);
            toast.success('Реквизиты организации сохранены');
            await load();
        } catch (error: any) {
            toast.error(error?.response?.data?.message ?? 'Не удалось сохранить организацию');
        } finally {
            setSaving(false);
        }
    };

    const syncMollie = async () => {
        await $apiPrivate.post('/company/organization/sync-mollie');
        toast.success('Доступные данные Mollie синхронизированы');
        await load();
    };

    const saveBrand = async () => {
        if (!organization.id) return toast.error('Сначала сохраните организацию');
        setSaving(true);
        try {
            const payload = { ...brandForm, organizationId: organization.id };
            if (brandForm.id) await $apiPrivate.put(`/company/brands/${brandForm.id}`, payload);
            else await $apiPrivate.post('/company/brands', payload);
            toast.success('Бренд сохранён');
            await load();
        } catch (error: any) {
            toast.error(error?.response?.data?.message ?? 'Не удалось сохранить бренд');
        } finally {
            setSaving(false);
        }
    };

    const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const form = new FormData();
            form.append('file', file);
            const response = await $apiPrivate.post<{ url: string }>('/company/brands/upload', form);
            setBrandForm((current) => ({ ...current, logoUrl: response.data.url }));
            toast.success('Логотип загружен');
        } catch (error: any) {
            toast.error(error?.response?.data?.message ?? 'Не удалось загрузить логотип');
        } finally {
            setUploadingLogo(false);
            event.target.value = '';
        }
    };

    const archive = async (id?: number) => {
        if (!id || !window.confirm('Архивировать бренд? Старые инвойсы сохранят его данные.')) return;
        await $apiPrivate.delete(`/company/brands/${id}`);
        toast.success('Бренд архивирован');
        await load();
    };

    return <Page>
        <div className={s.header}>
            <div><h1>{t('Организация и бренды')}</h1><p>{t('Юридическое лицо и торговые названия для инвойсов.')}</p></div>
            <button onClick={syncMollie}>{t('Синхронизировать Mollie')}</button>
        </div>

        <section className={s.card}>
            <h2>{t('Юридическая организация')}</h2>
            <div className={s.grid}>
                {textFields.map(([key, label]) => <label key={key}>{label}
                    <input value={String(organization[key] ?? '')} onChange={(event) => setOrganization({ ...organization, [key]: event.target.value })} />
                </label>)}
            </div>
            <button className={s.primary} disabled={saving} onClick={saveOrganization}>{t('Сохранить реквизиты')}</button>
        </section>

        <section className={s.card}>
            <h2>{brandForm.id ? `Редактировать ${brandForm.name}` : 'Добавить бренд / проект'}</h2>
            <div className={s.grid}>
                <label>{t('Название *')}<input value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} /></label>
                <label>{t('Slug *')}<input placeholder="talent-center-ddc" value={brandForm.slug} onChange={(e) => setBrandForm({ ...brandForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} /></label>
                <label>{t('Email')}<input value={brandForm.email} onChange={(e) => setBrandForm({ ...brandForm, email: e.target.value })} /></label>
                <label>{t('Телефон')}<input value={brandForm.phone} onChange={(e) => setBrandForm({ ...brandForm, phone: e.target.value })} /></label>
                <label>{t('Сайт')}<input value={brandForm.website} onChange={(e) => setBrandForm({ ...brandForm, website: e.target.value })} /></label>
                <label>{t('Адрес')}<input value={brandForm.address} onChange={(e) => setBrandForm({ ...brandForm, address: e.target.value })} /></label>
                <label>{t('Mollie profile ID')}<input value={brandForm.mollieProfileId} onChange={(e) => setBrandForm({ ...brandForm, mollieProfileId: e.target.value })} /></label>
                <label>{t('Цвет')}<input type="color" value={brandForm.primaryColor} onChange={(e) => setBrandForm({ ...brandForm, primaryColor: e.target.value })} /></label>
                <label>{t('Логотип')}
                    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingLogo} onChange={uploadLogo} />
                    {uploadingLogo && <small>Загрузка...</small>}
                </label>
                <label className={s.check}><input type="checkbox" checked={brandForm.isDefault} onChange={(e) => setBrandForm({ ...brandForm, isDefault: e.target.checked })} /> {t('Бренд по умолчанию')}</label>
            </div>
            {brandForm.logoUrl && <img className={s.logoPreview} src={getLogoSrc(brandForm.logoUrl)} alt={brandForm.name || 'Логотип'} />}
            <div className={s.actions}>
                <button className={s.primary} disabled={saving} onClick={saveBrand}>{t('Сохранить бренд')}</button>
                {brandForm.id && <button onClick={() => setBrandForm(emptyBrand(organization.id))}>{t('Отмена')}</button>}
            </div>
        </section>

        <section className={s.card}>
            <h2>{t('Бренды и проекты')}</h2>
            <div className={s.brands}>{brands.map((brand) => <article className={s.brand} key={brand.id}>
                {brand.logoUrl ? <img src={getLogoSrc(brand.logoUrl)} alt={brand.name} /> : <span className={s.swatch} style={{ background: brand.primaryColor }} />}
                <div><strong>{brand.name}</strong><small>{brand.isDefault ? 'По умолчанию · ' : ''}{brand.isActive ? 'Активен' : 'В архиве'}</small></div>
                <button onClick={() => setBrandForm(brand)}>{t('Редактировать')}</button>
                {brand.isActive && <button className={s.danger} onClick={() => archive(brand.id)}>{t('Архивировать')}</button>}
            </article>)}</div>
        </section>
    </Page>;
};

export default OrganizationBrandsPage;
