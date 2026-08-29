import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import cls from './ClientForm.module.scss';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { clientActions, clientReducer } from '../../model/slices/clientSlice';
import { useSelector } from 'react-redux';
import { getAddClientForm } from '../../model/selectors/getAddClientForm/getAddClientForm';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { addClientData } from '../../model/services/addClientData/addClientData';
import { ClientCard, ClientLanguage } from '@/entities/Client';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { MollieClient } from '@/entities/MollieClient';

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

interface MollieCustomersResponse {
    items: MollieClient[];
}

type PayerRelation = 'self' | 'parent' | 'guardian' | 'unknown';

const payerRelationOptions: SelectOption<PayerRelation>[] = [
    { value: 'self', content: 'Сам ученик' },
    { value: 'parent', content: 'Родитель' },
    { value: 'guardian', content: 'Опекун' },
    { value: 'unknown', content: 'Не указано' },
];

const getMollieCustomerName = (customer: MollieClient) => (
    customer.payerName
    || [customer.givenName, customer.familyName].filter(Boolean).join(' ')
    || customer.email
    || customer.mollieId
    || `Платёжный аккаунт #${customer.id}`
);

interface AddClientFormProps {
    className?: string;
    onSuccess: () => void;
    reloadPage?: () => void;
}

const initialReducers: ReducersList = {
    client: clientReducer,
};

const AddClientForm = memo((props: AddClientFormProps) => {
    const { className, onSuccess, reloadPage } = props;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [file, setFile] = useState<File | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [groups, setGroups] = useState<DanceGroup[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
    const [mollieCustomers, setMollieCustomers] = useState<MollieClient[]>([]);
    const [mollieCustomerId, setMollieCustomerId] = useState('');
    const [payerRelation, setPayerRelation] = useState<PayerRelation>('parent');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formData = useSelector(getAddClientForm);

    useEffect(() => {
        Promise.all([
            $apiPrivate.get<Branch[]>('/company/branches'),
            $apiPrivate.get<{ data: DanceGroup[] }>('/schedule/groups', { params: { limit: 1000 } }),
            $apiPrivate.get<MollieCustomersResponse>('/mollie/customers', {
                params: { _page: 1, _limit: 100 },
            }),
        ])
            .then(([branchesResponse, groupsResponse, customersResponse]) => {
                setBranches(branchesResponse.data.filter((branch) => branch.isActive !== false));
                setGroups(groupsResponse.data.data);
                setMollieCustomers(customersResponse.data.items);
            })
            .catch(() => {
                setBranches([]);
                setGroups([]);
                setMollieCustomers([]);
            });
    }, []);

    const branchOptions = useMemo<SelectOption<string>[]>(
        () => [
            { value: '', content: t('Без филиала') },
            ...branches.map((branch) => ({
                value: String(branch.id),
                content: branch.name,
            })),
        ],
        [branches, t]
    );

    const mollieCustomerOptions = useMemo<SelectOption<string>[]>(
        () => [
            { value: '', content: t('Не привязывать платёжный аккаунт') },
            ...mollieCustomers.map((customer) => ({
                value: String(customer.id),
                content: customer.email
                    ? `${getMollieCustomerName(customer)} · ${customer.email}`
                    : getMollieCustomerName(customer),
            })),
        ],
        [mollieCustomers, t]
    );

    const cleanForm = useCallback(() => {
        onChangeFirstName('');
        onChangeLastName('');
        onChangeBirthday('');
        onChangePhoneNumber('');
        onChangeEmail('');
        onChangeSocial('');
        onChangeBranchId('');
        setSelectedGroupIds([]);
        setMollieCustomerId('');
        setPayerRelation('parent');
        setFile(null);
        setValidationErrors([]);
    }, []);

    const onChangeFirstName = useCallback(
        (value?: string) => {
            dispatch(clientActions.updateProfile({ firstName: value ?? '' }));
        },
        [dispatch]
    );
    const onChangeLastName = useCallback(
        (value?: string) => {
            dispatch(clientActions.updateProfile({ lastName: value || '' }));
        },
        [dispatch]
    );
    const onChangeBirthday = useCallback(
        (value?: string) => {
            dispatch(clientActions.updateProfile({ birthday: value || '' }));
        },
        [dispatch]
    );
    const onChangePhoneNumber = useCallback(
        (value?: string) => {
            dispatch(clientActions.updateProfile({ phoneNumber: value || '' }));
        },
        [dispatch]
    );
    const onChangeEmail = useCallback(
        (value?: string) => {
            dispatch(clientActions.updateProfile({ email: value || '' }));
        },
        [dispatch]
    );
    const onChangeSocial = useCallback(
        (value?: string) => {
            dispatch(clientActions.updateProfile({ social: value || '' }));
        },
        [dispatch]
    );
    const onChangeBranchId = useCallback(
        (value?: string) => {
            dispatch(clientActions.updateProfile({ branchId: value || null }));
            setSelectedGroupIds([]);
        },
        [dispatch]
    );
    const onChangePreferredLanguage = useCallback(
        (value?: ClientLanguage) => {
            dispatch(clientActions.updateProfile({ preferredLanguage: value || 'RU' }));
        },
        [dispatch]
    );
    const availableGroups = useMemo(
        () => groups.filter((group) => group.branchId === Number(formData?.branchId)),
        [formData?.branchId, groups],
    );
    const toggleGroup = useCallback((groupId: number) => {
        setSelectedGroupIds((current) => current.includes(groupId)
            ? current.filter((id) => id !== groupId)
            : [...current, groupId]);
    }, []);
    const onChangeImage = useCallback(
        (file?: File) => {
            if (file) {
                if (!file.type.startsWith('image/')) {
                    setValidationErrors(['Фото должно быть изображением']);
                    return;
                }

                if (file.size > 5 * 1024 * 1024) {
                    setValidationErrors(['Размер фото не должен превышать 5 MB']);
                    return;
                }

                setFile(file);
                setValidationErrors([]);
            }
        },
        []
    );

    const onSave = useCallback(async () => {
        const errors: string[] = [];
        const firstName = formData?.firstName?.trim();
        const lastName = formData?.lastName?.trim();
        const email = formData?.email?.trim();
        const phoneNumber = formData?.phoneNumber?.trim();

        if (!firstName && !lastName) {
            errors.push('Укажите имя или фамилию ученика');
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Введите корректный email или оставьте поле пустым');
        }

        if (phoneNumber && phoneNumber.replace(/\D/g, '').length < 6) {
            errors.push('Телефон должен содержать минимум 6 цифр');
        }

        if (formData?.birthday && new Date(formData.birthday) > new Date()) {
            errors.push('Дата рождения не может быть в будущем');
        }

        if (errors.length) {
            setValidationErrors(errors);
            return;
        }

        setValidationErrors([]);
        setIsSubmitting(true);
        const result = await dispatch(addClientData({
            file,
            mollieCustomerId,
            payerRelation,
            groupIds: selectedGroupIds,
        }));
        setIsSubmitting(false);

        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess();
            reloadPage?.();
            cleanForm();
            toast.success(t('Ученик успешно добавлен'));
        } else {
            toast.error(t('Не удалось добавить ученика'));
        }
    }, [cleanForm, dispatch, file, formData, mollieCustomerId, onSuccess, payerRelation, reloadPage, selectedGroupIds, t]);

    return (
        <DynamicModuleLoader reducers={initialReducers}>
            <div className={classNames(cls.AddClientForm, {}, [className])}>
                <VStack gap="16" max className={cls.header}>
                    <div className={cls.titleBlock}>
                        <Text size="m" title={t('Добавление ученика')} bold />
                        <Text size="s" text={t('Email необязателен. При необходимости сразу привяжите платёжный аккаунт.')} />
                    </div>
                    <ClientCard
                        onChangeLastName={onChangeLastName}
                        onChangeFirstName={onChangeFirstName}
                        onChangeBirthday={onChangeBirthday}
                        onChangePhoneNumber={onChangePhoneNumber}
                        onChangeEmail={onChangeEmail}
                        onChangeImage={onChangeImage}
                        onChangeSocial={onChangeSocial}
                        onChangeBranchId={onChangeBranchId}
                        onChangePreferredLanguage={onChangePreferredLanguage}
                        branchOptions={branchOptions}
                        data={formData}
                    />
                    {formData?.branchId && (
                        <div className={cls.groupSection}>
                            <Text size="s" title={t('Группы филиала')} bold />
                            {availableGroups.length ? (
                                <div className={cls.groupOptions}>
                                    {availableGroups.map((group) => (
                                        <label key={group.id} className={cls.groupOption}>
                                            <input
                                                type="checkbox"
                                                checked={selectedGroupIds.includes(group.id)}
                                                onChange={() => toggleGroup(group.id)}
                                            />
                                            <span><strong>{group.name}</strong><small>{group.style} · {group.level}</small></span>
                                        </label>
                                    ))}
                                </div>
                            ) : <Text size="s" text={t('В выбранном филиале пока нет доступных групп.')} />}
                        </div>
                    )}
                    <div className={cls.paymentSection}>
                        <Text size="s" title={t('Платёжный аккаунт')} bold />
                        <Text size="s" text={t('Необязательно. Можно связать существующего плательщика с новым учеником.')} />
                        <div className={cls.paymentGrid}>
                            <Select
                                label="Mollie payment account"
                                options={mollieCustomerOptions}
                                value={mollieCustomerId}
                                onChange={setMollieCustomerId}
                            />
                            {mollieCustomerId && (
                                <Select<PayerRelation>
                                    label="Роль плательщика"
                                    options={payerRelationOptions}
                                    value={payerRelation}
                                    onChange={setPayerRelation}
                                />
                            )}
                        </div>
                    </div>
                    {!!validationErrors.length && (
                        <div className={cls.validationErrors}>
                            {validationErrors.map((error) => (
                                <Text key={error} size="s" text={error} variant="error" />
                            ))}
                        </div>
                    )}
                    <Button
                        className={cls.submitButton}
                        fullWidth
                        onClick={onSave}
                        theme={ButtonTheme.BACKGROUND_INVERTED}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? t('Добавление...') : t('Добавить')}
                    </Button>
                </VStack>
            </div>
        </DynamicModuleLoader>
    );
});

export default AddClientForm;
