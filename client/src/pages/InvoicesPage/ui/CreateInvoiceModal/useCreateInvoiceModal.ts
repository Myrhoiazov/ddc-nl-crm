import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import {
    Invoice,
    InvoiceBranch,
    InvoiceBusinessBrand,
    InvoiceClient,
    InvoiceGroup,
    InvoiceStatus,
} from '../../model/types';

export interface FormItem {
    groupId: string;
    description: string;
    period: string;
    quantity: number;
    price: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editInvoice?: Invoice | null;
    paidMode?: boolean;
}

export const today = () => new Date().toISOString().slice(0, 10);

export const inFiveBusinessDays = () => {
    const value = new Date();
    let days = 0;
    while (days < 5) {
        value.setDate(value.getDate() + 1);
        if (value.getDay() !== 0 && value.getDay() !== 6) days += 1;
    }
    return value.toISOString().slice(0, 10);
};

export const emptyItem = (): FormItem => ({ groupId: '', description: '', period: '', quantity: 1, price: '0.00' });

const dateInputValue = (value?: string | null) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export const branchAddress = (branch: InvoiceBranch) => [branch.address, branch.city].filter(Boolean).join(', ');

export const brandAddress = (brand?: InvoiceBusinessBrand) => brand?.address ?? [
    brand?.organization?.registrationAddress,
    brand?.organization?.postalCode,
    brand?.organization?.city,
].filter(Boolean).join(', ');

export interface UseCreateInvoiceModalResult {
    clients: InvoiceClient[];
    brands: InvoiceBusinessBrand[];
    branches: InvoiceBranch[];
    groups: InvoiceGroup[];
    businessBrandId: string;
    setBusinessBrandId: Dispatch<SetStateAction<string>>;
    addressSource: string;
    setAddressSource: Dispatch<SetStateAction<string>>;
    clientId: string;
    billToName: string;
    setBillToName: (value: string) => void;
    billToEmail: string;
    setBillToEmail: (value: string) => void;
    issueDate: string;
    setIssueDate: (value: string) => void;
    dueDate: string;
    setDueDate: (value: string) => void;
    status: Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>;
    setStatus: (value: Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>) => void;
    issuerName: string;
    setIssuerName: (value: string) => void;
    issuerAddress: string;
    setIssuerAddress: (value: string) => void;
    issuerEmail: string;
    setIssuerEmail: (value: string) => void;
    bankName: string;
    setBankName: (value: string) => void;
    iban: string;
    setIban: (value: string) => void;
    note: string;
    setNote: (value: string) => void;
    showPaymentButton: boolean;
    setShowPaymentButton: (value: boolean) => void;
    showPaymentQr: boolean;
    setShowPaymentQr: (value: boolean) => void;
    items: FormItem[];
    setItems: (updater: (current: FormItem[]) => FormItem[]) => void;
    saving: boolean;
    totalCents: number;
    updateItem: (index: number, patch: Partial<FormItem>) => void;
    addItem: () => void;
    removeItem: (index: number) => void;
    selectClient: (value: string) => void;
    selectGroup: (index: number, value: string) => void;
    selectBusinessBrand: (value: string) => void;
    selectAddressSource: (value: string) => void;
    submit: () => void;
    editInvoice?: Invoice | null;
    paidMode: boolean;
}

export const useCreateInvoiceModal = ({ isOpen, onClose, onSaved, editInvoice, paidMode = false }: Props): UseCreateInvoiceModalResult => {
    const [clients, setClients] = useState<InvoiceClient[]>([]);
    const [groups, setGroups] = useState<InvoiceGroup[]>([]);
    const [brands, setBrands] = useState<InvoiceBusinessBrand[]>([]);
    const [branches, setBranches] = useState<InvoiceBranch[]>([]);
    const [businessBrandId, setBusinessBrandId] = useState('');
    const [addressSource, setAddressSource] = useState('manual');
    const [clientId, setClientId] = useState('');
    const [billToName, setBillToName] = useState('');
    const [billToEmail, setBillToEmail] = useState('');
    const [issueDate, setIssueDate] = useState(today());
    const [dueDate, setDueDate] = useState(inFiveBusinessDays());
    const [status, setStatus] = useState<Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>>('DRAFT');
    const [issuerName, setIssuerName] = useState('Talent Center DDC');
    const [issuerAddress, setIssuerAddress] = useState('');
    const [issuerEmail, setIssuerEmail] = useState('');
    const [bankName, setBankName] = useState('');
    const [iban, setIban] = useState('');
    const [note, setNote] = useState('');
    const [showPaymentButton, setShowPaymentButton] = useState(true);
    const [showPaymentQr, setShowPaymentQr] = useState(true);
    const [items, setItems] = useState<FormItem[]>([emptyItem()]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        Promise.all([
            $apiPrivate.get<InvoiceClient[]>('/clients'),
            $apiPrivate.get<{ data: InvoiceGroup[] }>('/schedule/groups', { params: { limit: 100 } }),
            $apiPrivate.get<InvoiceBusinessBrand[]>('/company/brands'),
            $apiPrivate.get<InvoiceBranch[]>('/company/branches'),
        ]).then(([clientsResponse, groupsResponse, brandsResponse, branchesResponse]) => {
            setClients(clientsResponse.data.map((client) => ({ ...client, id: Number(client.id) })));
            setGroups(groupsResponse.data.data);
            setBrands(brandsResponse.data.filter((brand) => brand.isActive !== false));
            setBranches(branchesResponse.data.filter((branch) => branch.isActive !== false));
        });
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (editInvoice) {
            setClientId(editInvoice.client?.id ? String(editInvoice.client.id) : '');
            setBusinessBrandId(editInvoice.businessBrandId ? String(editInvoice.businessBrandId) : '');
            setAddressSource('manual');
            setBillToName(editInvoice.billToName);
            setBillToEmail(editInvoice.billToEmail ?? '');
            setIssueDate(dateInputValue(editInvoice.issueDate));
            setDueDate(dateInputValue(editInvoice.dueDate));
            setStatus(editInvoice.status === 'DRAFT' ? 'DRAFT' : 'ISSUED');
            setIssuerName(editInvoice.issuerName);
            setIssuerAddress(editInvoice.issuerAddress ?? '');
            setIssuerEmail(editInvoice.issuerEmail ?? '');
            setBankName(editInvoice.bankName ?? '');
            setIban(editInvoice.iban ?? '');
            setNote(editInvoice.note ?? '');
            setShowPaymentButton(editInvoice.showPaymentButton);
            setShowPaymentQr(editInvoice.showPaymentQr);
            setItems(editInvoice.items.map((item) => ({
                groupId: item.group?.id ? String(item.group.id) : '',
                description: item.description,
                period: item.period ?? '',
                quantity: item.quantity,
                price: (item.unitPriceCents / 100).toFixed(2),
            })));
            return;
        }

        setClientId('');
        setBusinessBrandId('');
        setAddressSource('manual');
        setBillToName('');
        setBillToEmail('');
        setIssueDate(today());
        setDueDate(inFiveBusinessDays());
        setStatus('DRAFT');
        setIssuerName('Talent Center DDC');
        setIssuerAddress('');
        setIssuerEmail('');
        setBankName('');
        setIban('');
        setNote('');
        setShowPaymentButton(true);
        setShowPaymentQr(true);
        setItems([emptyItem()]);
    }, [editInvoice, isOpen, paidMode]);

    useEffect(() => {
        if (!isOpen || editInvoice || businessBrandId) return;
        const defaultBrand = brands.find((brand) => brand.isDefault);
        if (defaultBrand) {
            setBusinessBrandId(String(defaultBrand.id));
            setIssuerAddress(brandAddress(defaultBrand));
            setAddressSource('brand');
        }
    }, [brands, businessBrandId, editInvoice, isOpen]);

    const totalCents = useMemo(() => items.reduce((sum, item) => (
        sum + Math.round(Number(item.price || 0) * 100) * Number(item.quantity || 0)
    ), 0), [items]);

    const updateItem = useCallback((index: number, patch: Partial<FormItem>) => {
        setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    }, []);

    const addItem = useCallback(() => {
        setItems((current) => [...current, emptyItem()]);
    }, []);

    const removeItem = useCallback((index: number) => {
        setItems((current) => current.filter((_, i) => i !== index));
    }, []);

    const selectClient = useCallback((value: string) => {
        setClientId(value);
        const client = clients.find((item) => item.id === Number(value));
        if (client) {
            setBillToName([client.firstName, client.lastName].filter(Boolean).join(' '));
            setBillToEmail(client.email ?? '');
        }
    }, [clients]);

    const selectGroup = useCallback((index: number, value: string) => {
        const group = groups.find((item) => item.id === Number(value));
        if (group?.branch && branchAddress(group.branch)) {
            setIssuerAddress(branchAddress(group.branch));
            setAddressSource(`branch:${group.branch.id}`);
        }
        updateItem(index, group ? {
            groupId: value,
            description: `Dance classes — ${group.name}`,
            price: ((group.lessonPriceCents ?? 0) / 100).toFixed(2),
        } : { groupId: value });
    }, [groups, updateItem]);

    const selectBusinessBrand = useCallback((value: string) => {
        setBusinessBrandId(value);
        const brand = brands.find((item) => item.id === Number(value));
        if (brand) {
            setIssuerAddress(brandAddress(brand));
            setAddressSource('brand');
        }
    }, [brands]);

    const selectAddressSource = useCallback((value: string) => {
        setAddressSource(value);
        if (value === 'brand') {
            setIssuerAddress(brandAddress(brands.find((brand) => brand.id === Number(businessBrandId))));
        } else if (value.startsWith('branch:')) {
            const branch = branches.find((item) => item.id === Number(value.slice('branch:'.length)));
            if (branch) setIssuerAddress(branchAddress(branch));
        }
    }, [brands, branches, businessBrandId]);

    const submit = useCallback(async () => {
        if (!billToName.trim() || items.some((item) => !item.description.trim())) {
            toast.error('Укажите получателя и описание каждой строки');
            return;
        }
        if (paidMode && totalCents <= 0) {
            toast.error('Сумма черновика должна быть больше нуля');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                clientId: clientId ? Number(clientId) : null,
                businessBrandId: businessBrandId ? Number(businessBrandId) : null,
                billToName,
                billToEmail,
                issueDate,
                dueDate: paidMode ? null : dueDate || null,
                status,
                issuerName,
                issuerAddress,
                issuerEmail,
                bankName,
                iban,
                note: note || null,
                showPaymentButton: paidMode ? false : showPaymentButton,
                showPaymentQr: paidMode ? false : showPaymentQr,
                items: items.map((item) => ({
                    groupId: item.groupId ? Number(item.groupId) : null,
                    description: item.description,
                    period: item.period || null,
                    quantity: item.quantity,
                    unitPriceCents: Math.round(Number(item.price || 0) * 100),
                })),
            };
            if (editInvoice) {
                await $apiPrivate.put(`/invoices/${editInvoice.id}`, payload);
                toast.success('Инвойс обновлён');
            } else if (paidMode) {
                await $apiPrivate.post('/invoices', {
                    ...payload,
                    status: 'DRAFT',
                    dueDate: null,
                    showPaymentButton: false,
                    showPaymentQr: false,
                });
                toast.success('Черновик сохранён. Проверьте его и подтвердите оплату в списке.');
            } else {
                await $apiPrivate.post('/invoices', payload);
                toast.success('Инвойс создан');
            }
            onSaved();
            onClose();
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
            toast.error(message || 'Не удалось сохранить инвойс');
        } finally {
            setSaving(false);
        }
    }, [
        billToName, items, paidMode, totalCents, clientId, businessBrandId, billToEmail,
        issueDate, dueDate, status, issuerName, issuerAddress, issuerEmail, bankName,
        iban, note, showPaymentButton, showPaymentQr, editInvoice, onSaved, onClose,
    ]);

    return {
        clients,
        brands,
        branches,
        groups,
        businessBrandId, setBusinessBrandId,
        addressSource, setAddressSource,
        clientId,
        billToName, setBillToName,
        billToEmail, setBillToEmail,
        issueDate, setIssueDate,
        dueDate, setDueDate,
        status, setStatus,
        issuerName, setIssuerName,
        issuerAddress, setIssuerAddress,
        issuerEmail, setIssuerEmail,
        bankName, setBankName,
        iban, setIban,
        note, setNote,
        showPaymentButton, setShowPaymentButton,
        showPaymentQr, setShowPaymentQr,
        items, setItems,
        saving,
        totalCents,
        updateItem,
        addItem,
        removeItem,
        selectClient,
        selectGroup,
        selectBusinessBrand,
        selectAddressSource,
        submit,
        editInvoice,
        paidMode,
    };
};
