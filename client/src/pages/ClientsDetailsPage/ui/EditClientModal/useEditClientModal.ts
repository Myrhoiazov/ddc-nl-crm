import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Client } from '@/entities/Client';
import { $apiPrivate } from '@/shared/api/api';
import { SelectOption } from '@/shared/ui/Select/Select';

export interface Branch {
    id: number;
    name: string;
    isActive?: boolean;
}

export interface DanceGroup {
    id: number;
    name: string;
    style: string;
    level: string;
    branchId?: number | null;
}

const toFormState = (client?: Client): Client => ({
    firstName: client?.firstName ?? '',
    lastName: client?.lastName ?? '',
    birthday: client?.birthday ?? '',
    phoneNumber: client?.phoneNumber ?? '',
    email: client?.email ?? '',
    social: client?.social ?? '',
    branchId: client?.branchId ?? '',
    preferredLanguage: client?.preferredLanguage ?? 'RU',
});

interface UseEditClientModalProps {
    clientId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export interface UseEditClientModalResult {
    form: Client;
    file: File | null;
    errors: Record<string, string>;
    isLoading: boolean;
    branchOptions: SelectOption<string>[];
    availableGroups: DanceGroup[];
    selectedGroupIds: number[];
    updateField: (field: keyof Client) => (value?: string) => void;
    updateBranch: (value?: string) => void;
    toggleGroup: (groupId: number) => void;
    onChangeImage: (value: File | File[]) => void;
    onSave: () => void;
}

export const useEditClientModal = ({ clientId, isOpen, onClose, onSuccess }: UseEditClientModalProps): UseEditClientModalResult => {
    const [form, setForm] = useState<Client>(toFormState());
    const [file, setFile] = useState<File | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [groups, setGroups] = useState<DanceGroup[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setFile(null);
        setErrors({});
        setIsLoading(true);
        Promise.all([
            $apiPrivate.get<Client>(`/clients/${clientId}`),
            $apiPrivate.get<Branch[]>('/company/branches'),
            $apiPrivate.get<{ data: DanceGroup[] }>('/schedule/groups', { params: { limit: 1000 } }),
        ])
            .then(([{ data }, branchesResponse, groupsResponse]) => {
                setForm(toFormState(data));
                setBranches(branchesResponse.data.filter((branch) => branch.isActive !== false));
                setGroups(groupsResponse.data.data);
                setSelectedGroupIds(data.groupMemberships?.map((membership) => membership.groupId) ?? []);
            })
            .catch(() => {
                toast.error('Не удалось загрузить данные ученика');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [clientId, isOpen]);

    const branchOptions: SelectOption<string>[] = [
        { value: '', content: 'Без филиала' },
        ...branches.map((branch) => ({
            value: String(branch.id),
            content: branch.name,
        })),
    ];

    const updateField = useCallback((field: keyof Client) => (value?: string) => {
        setForm((prev) => ({
            ...prev,
            [field]: value ?? '',
        }));
        setErrors((prev) => {
            const next = { ...prev };
            delete next[String(field)];
            return next;
        });
    }, []);

    const updateBranch = useCallback((value?: string) => {
        updateField('branchId')(value);
        setSelectedGroupIds([]);
    }, [updateField]);

    const availableGroups = groups.filter((group) => group.branchId === Number(form.branchId));

    const toggleGroup = useCallback((groupId: number) => {
        setSelectedGroupIds((current) => current.includes(groupId)
            ? current.filter((id) => id !== groupId)
            : [...current, groupId]);
    }, []);

    const onChangeImage = useCallback((value: File | File[]) => {
        setFile(Array.isArray(value) ? value[0] : value);
        setErrors((prev) => {
            const next = { ...prev };
            delete next.image;
            return next;
        });
    }, []);

    const onSave = useCallback(async () => {
        const nextErrors: Record<string, string> = {};
        const email = form.email?.trim();
        const phone = form.phoneNumber?.trim();

        if (!form.firstName?.trim() && !form.lastName?.trim()) nextErrors.firstName = 'Укажите имя или фамилию';
        if ((form.firstName?.trim().length ?? 0) > 100) nextErrors.firstName = 'Имя слишком длинное';
        if ((form.lastName?.trim().length ?? 0) > 100) nextErrors.lastName = 'Фамилия слишком длинная';
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Некорректный email';
        if ((email?.length ?? 0) > 254) nextErrors.email = 'Email слишком длинный';
        if (phone && phone.replace(/\D/g, '').length < 7) nextErrors.phoneNumber = 'Телефон слишком короткий';
        if ((phone?.length ?? 0) > 32) nextErrors.phoneNumber = 'Телефон слишком длинный';
        if (form.birthday && new Date(form.birthday) > new Date()) nextErrors.birthday = 'Дата рождения не может быть в будущем';
        if ((form.social?.trim().length ?? 0) > 255) nextErrors.social = 'Ссылка на социальную сеть слишком длинная';
        if (file && !file.type.startsWith('image/')) nextErrors.image = 'Выберите изображение';
        if (file && file.size > 5 * 1024 * 1024) nextErrors.image = 'Размер изображения не должен превышать 5 MB';

        setErrors(nextErrors);

        if (Object.keys(nextErrors).length) {
            return;
        }

        const payload = new FormData();

        Object.entries(form).forEach(([key, value]) => {
            payload.append(key, String(value ?? ''));
        });
        payload.append('groupIds', JSON.stringify(selectedGroupIds));

        if (file) {
            payload.append('image', file);
        }

        setIsLoading(true);

        try {
            await $apiPrivate.put<Client>(`/clients/${clientId}`, payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Данные ученика обновлены');
            onSuccess?.();
            onClose();
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const fieldErrors = error.response?.data?.details?.fieldErrors as Record<string, string[]> | undefined;
                if (fieldErrors) {
                    setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([key, messages]) => [key, messages[0]])));
                }
            }
            toast.error('Не удалось обновить ученика');
        } finally {
            setIsLoading(false);
        }
    }, [clientId, file, form, onClose, onSuccess, selectedGroupIds]);

    return {
        form,
        file,
        errors,
        isLoading,
        branchOptions,
        availableGroups,
        selectedGroupIds,
        updateField,
        updateBranch,
        toggleGroup,
        onChangeImage,
        onSave,
    };
};
