import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { $apiPrivate } from '@/shared/api/api';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { SelectOption } from '@/shared/ui/Select/Select';
import { ClientLanguage } from '@/entities/Client';
import { MollieClient } from '@/entities/MollieClient';
import { clientActions } from '../../model/slices/clientSlice';
import { getAddClientForm } from '../../model/selectors/getAddClientForm/getAddClientForm';
import { addClientData } from '../../model/services/addClientData/addClientData';

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

export type PayerRelation = 'self' | 'parent' | 'guardian' | 'unknown';

export const payerRelationOptions: SelectOption<PayerRelation>[] = [
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

const useClientFormState = () => {
    const dispatch = useAppDispatch();
    const [file, setFile] = useState<File | null>(null);
    const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
    const [mollieCustomerId, setMollieCustomerId] = useState('');
    const [payerRelation, setPayerRelation] = useState<PayerRelation>('parent');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onChangeFirstName = useCallback((value?: string) => {
        dispatch(clientActions.updateProfile({ firstName: value ?? '' }));
    }, [dispatch]);
    const onChangeLastName = useCallback((value?: string) => {
        dispatch(clientActions.updateProfile({ lastName: value || '' }));
    }, [dispatch]);
    const onChangeBirthday = useCallback((value?: string) => {
        dispatch(clientActions.updateProfile({ birthday: value || '' }));
    }, [dispatch]);
    const onChangePhoneNumber = useCallback((value?: string) => {
        dispatch(clientActions.updateProfile({ phoneNumber: value || '' }));
    }, [dispatch]);
    const onChangeEmail = useCallback((value?: string) => {
        dispatch(clientActions.updateProfile({ email: value || '' }));
    }, [dispatch]);
    const onChangeSocial = useCallback((value?: string) => {
        dispatch(clientActions.updateProfile({ social: value || '' }));
    }, [dispatch]);
    const onChangeBranchId = useCallback((value?: string) => {
        dispatch(clientActions.updateProfile({ branchId: value || null }));
        setSelectedGroupIds([]);
    }, [dispatch]);
    const onChangePreferredLanguage = useCallback((value?: ClientLanguage) => {
        dispatch(clientActions.updateProfile({ preferredLanguage: value || 'RU' }));
    }, [dispatch]);

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
    }, [onChangeBranchId, onChangeEmail, onChangeFirstName, onChangeLastName, onChangePhoneNumber, onChangeSocial, onChangeBirthday]);

    const onChangeImage = useCallback((file?: File) => {
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
    }, []);

    const toggleGroup = useCallback((groupId: number) => {
        setSelectedGroupIds((current) => current.includes(groupId)
            ? current.filter((id) => id !== groupId)
            : [...current, groupId]);
    }, []);

    return {
        file, setFile, selectedGroupIds, setSelectedGroupIds,
        mollieCustomerId, setMollieCustomerId,
        payerRelation, setPayerRelation,
        validationErrors, setValidationErrors,
        isSubmitting, setIsSubmitting,
        onChangeFirstName, onChangeLastName, onChangeBirthday,
        onChangePhoneNumber, onChangeEmail, onChangeSocial,
        onChangeBranchId, onChangePreferredLanguage, onChangeImage,
        toggleGroup, cleanForm,
    };
};

const useClientFormData = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [groups, setGroups] = useState<DanceGroup[]>([]);
    const [mollieCustomers, setMollieCustomers] = useState<MollieClient[]>([]);
    const { t } = useTranslation();
    const formData = useSelector(getAddClientForm);

    useEffect(() => {
        Promise.all([
            $apiPrivate.get<Branch[]>('/company/branches'),
            $apiPrivate.get<{ data: DanceGroup[] }>('/schedule/groups', { params: { limit: 1000 } }),
            $apiPrivate.get<MollieCustomersResponse>('/mollie/customers', { params: { _page: 1, _limit: 100 } }),
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
            ...branches.map((branch) => ({ value: String(branch.id), content: branch.name })),
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

    const availableGroups = useMemo(
        () => groups.filter((group) => group.branchId === Number(formData?.branchId)),
        [formData?.branchId, groups],
    );

    return { formData, branchOptions, mollieCustomerOptions, availableGroups };
};

const useClientFormSubmit = (onSuccess: () => void, reloadPage: (() => void) | undefined, state: ReturnType<typeof useClientFormState>) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const formData = useSelector(getAddClientForm);
    const { file, mollieCustomerId, payerRelation, selectedGroupIds, setValidationErrors, setIsSubmitting, cleanForm } = state;

    const onSave = useCallback(async () => {
        const errors: string[] = [];
        const firstName = formData?.firstName?.trim();
        const lastName = formData?.lastName?.trim();
        const email = formData?.email?.trim();
        const phoneNumber = formData?.phoneNumber?.trim();

        if (!firstName && !lastName) errors.push('Укажите имя или фамилию ученика');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Введите корректный email или оставьте поле пустым');
        if (phoneNumber && phoneNumber.replace(/\D/g, '').length < 6) errors.push('Телефон должен содержать минимум 6 цифр');
        if (formData?.birthday && new Date(formData.birthday) > new Date()) errors.push('Дата рождения не может быть в будущем');

        if (errors.length) {
            setValidationErrors(errors);
            return;
        }

        setValidationErrors([]);
        setIsSubmitting(true);
        const result = await dispatch(addClientData({ file, mollieCustomerId, payerRelation, groupIds: selectedGroupIds }));
        setIsSubmitting(false);

        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess();
            reloadPage?.();
            cleanForm();
            toast.success(t('Ученик успешно добавлен'));
        } else {
            toast.error(t('Не удалось добавить ученика'));
        }
    }, [cleanForm, dispatch, file, formData, mollieCustomerId, onSuccess, payerRelation, reloadPage, selectedGroupIds, t, setValidationErrors, setIsSubmitting]);

    return { onSave };
};

export const useClientForm = (onSuccess: () => void, reloadPage?: () => void) => {
    const state = useClientFormState();
    const { formData, branchOptions, mollieCustomerOptions, availableGroups } = useClientFormData();
    const { onSave } = useClientFormSubmit(onSuccess, reloadPage, state);

    return {
        formData,
        branchOptions,
        mollieCustomerOptions,
        availableGroups,
        selectedGroupIds: state.selectedGroupIds,
        toggleGroup: state.toggleGroup,
        mollieCustomerId: state.mollieCustomerId,
        setMollieCustomerId: state.setMollieCustomerId,
        payerRelation: state.payerRelation,
        setPayerRelation: state.setPayerRelation,
        validationErrors: state.validationErrors,
        isSubmitting: state.isSubmitting,
        onChangeFirstName: state.onChangeFirstName,
        onChangeLastName: state.onChangeLastName,
        onChangeBirthday: state.onChangeBirthday,
        onChangePhoneNumber: state.onChangePhoneNumber,
        onChangeEmail: state.onChangeEmail,
        onChangeSocial: state.onChangeSocial,
        onChangeBranchId: state.onChangeBranchId,
        onChangePreferredLanguage: state.onChangePreferredLanguage,
        onChangeImage: state.onChangeImage,
        onSave,
    };
};
