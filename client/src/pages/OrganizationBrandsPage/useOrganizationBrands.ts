import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';

export interface Organization {
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

export interface Brand {
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

export const useOrganizationBrands = () => {
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

    const resetBrandForm = () => setBrandForm(emptyBrand(organization.id));

    return {
        organization,
        setOrganization,
        brands,
        brandForm,
        setBrandForm,
        saving,
        uploadingLogo,
        saveOrganization,
        syncMollie,
        saveBrand,
        uploadLogo,
        archive,
        resetBrandForm,
    };
};
