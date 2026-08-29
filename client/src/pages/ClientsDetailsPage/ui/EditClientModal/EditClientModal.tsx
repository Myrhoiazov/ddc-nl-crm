import { memo, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Client, ClientLanguage, CLIENT_LANGUAGE_OPTIONS } from '@/entities/Client';
import { $apiPrivate } from '@/shared/api/api';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input/Input';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import s from './EditClientModal.module.scss';
import axios from 'axios';

interface EditClientModalProps {
    className?: string;
    clientId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface Branch {
    id: number;
    name: string;
    isActive?: boolean;
}

interface DanceGroup {
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

export const EditClientModal = memo((props: EditClientModalProps) => {
    const { className, clientId, isOpen, onClose, onSuccess } = props;
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
    const toggleGroup = (groupId: number) => {
        setSelectedGroupIds((current) => current.includes(groupId)
            ? current.filter((id) => id !== groupId)
            : [...current, groupId]);
    };

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

    return (
        <Modal className={classNames('', {}, [className])} isOpen={isOpen} onClose={onClose} lazy>
            <VStack className={s.form} gap="16" max>
                <div className={s.titleBlock}>
                    <Text size="m" title="Редактирование ученика" bold />
                    <Text size="s" text="Обновите основные данные ученика." />
                </div>
                <div className={s.grid}>
                    <div className={s.field}>
                        <Input fullWidth label="Имя" type="text" value={form.firstName ?? ''} onChange={updateField('firstName')} />
                        {errors.firstName && <span className={s.fieldError}>{errors.firstName}</span>}
                    </div>
                    <div className={s.field}>
                        <Input fullWidth label="Фамилия" type="text" value={form.lastName ?? ''} onChange={updateField('lastName')} />
                        {errors.lastName && <span className={s.fieldError}>{errors.lastName}</span>}
                    </div>
                    <div className={s.field}>
                        <Input fullWidth label="Дата рождения" type="date" value={form.birthday ?? ''} onChange={updateField('birthday')} />
                        {errors.birthday && <span className={s.fieldError}>{errors.birthday}</span>}
                    </div>
                    <div className={s.field}>
                        <Input fullWidth label="Телефон" type="tel" value={form.phoneNumber ?? ''} onChange={updateField('phoneNumber')} />
                        {errors.phoneNumber && <span className={s.fieldError}>{errors.phoneNumber}</span>}
                    </div>
                    <div className={s.field}>
                        <Input fullWidth label="E-mail" type="email" value={form.email ?? ''} onChange={updateField('email')} />
                        {errors.email && <span className={s.fieldError}>{errors.email}</span>}
                    </div>
                    <div className={s.field}>
                        <Input fullWidth label="Социальные сети" type="text" value={form.social ?? ''} onChange={updateField('social')} />
                        {errors.social && <span className={s.fieldError}>{errors.social}</span>}
                    </div>
                    <div className={s.field}>
                        <Select label="Филиал" options={branchOptions} value={form.branchId ? String(form.branchId) : ''} onChange={updateBranch} />
                        {errors.branchId && <span className={s.fieldError}>{errors.branchId}</span>}
                    </div>
                    <div className={s.field}>
                        <Select<ClientLanguage>
                            label="Язык клиента"
                            options={CLIENT_LANGUAGE_OPTIONS}
                            value={form.preferredLanguage ?? 'RU'}
                            onChange={updateField('preferredLanguage')}
                        />
                        {errors.preferredLanguage && <span className={s.fieldError}>{errors.preferredLanguage}</span>}
                    </div>
                    <div className={s.field}>
                        <Input fullWidth label="Фото ученика" type="file" onChange={onChangeImage} />
                        {errors.image && <span className={s.fieldError}>{errors.image}</span>}
                    </div>
                </div>
                {form.branchId && (
                    <div className={s.groupSection}>
                        <Text size="s" title="Группы филиала" bold />
                        {availableGroups.length ? (
                            <div className={s.groupOptions}>
                                {availableGroups.map((group) => (
                                    <label key={group.id} className={s.groupOption}>
                                        <input
                                            type="checkbox"
                                            checked={selectedGroupIds.includes(group.id)}
                                            onChange={() => toggleGroup(group.id)}
                                        />
                                        <span><strong>{group.name}</strong><small>{group.style} · {group.level}</small></span>
                                    </label>
                                ))}
                            </div>
                        ) : <Text size="s" text="В выбранном филиале пока нет доступных групп." />}
                    </div>
                )}
                <HStack className={s.actions} gap="16" justify="end">
                    <Button theme={ButtonTheme.OUTLINE} onClick={onClose} disabled={isLoading}>
                        Отмена
                    </Button>
                    <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onSave} disabled={isLoading}>
                        Сохранить
                    </Button>
                </HStack>
            </VStack>
        </Modal>
    );
});
