import { memo, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/shared/ui/Modal/Modal';
import { $apiPrivate } from '@/shared/api/api';
import { toast } from 'react-toastify';
import { Invoice, InvoiceBranch, InvoiceBusinessBrand, InvoiceClient, InvoiceGroup, InvoiceStatus } from '../../model/types';
import s from './CreateInvoiceModal.module.scss';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editInvoice?: Invoice | null;
    paidMode?: boolean;
}

interface FormItem {
    groupId: string;
    description: string;
    period: string;
    quantity: number;
    price: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const inFiveBusinessDays = () => {
    const value = new Date();
    let days = 0;
    while (days < 5) {
        value.setDate(value.getDate() + 1);
        if (value.getDay() !== 0 && value.getDay() !== 6) days += 1;
    }
    return value.toISOString().slice(0, 10);
};
const emptyItem = (): FormItem => ({ groupId: '', description: '', period: '', quantity: 1, price: '0.00' });
const dateInputValue = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : '';
const branchAddress = (branch: InvoiceBranch) => [branch.address, branch.city].filter(Boolean).join(', ');
const brandAddress = (brand?: InvoiceBusinessBrand) => brand?.address ?? [
    brand?.organization?.registrationAddress,
    brand?.organization?.postalCode,
    brand?.organization?.city,
].filter(Boolean).join(', ');

export const CreateInvoiceModal = memo(({ isOpen, onClose, onSaved, editInvoice, paidMode = false }: Props) => {
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

    const updateItem = (index: number, patch: Partial<FormItem>) => {
        setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    };

    const selectClient = (value: string) => {
        setClientId(value);
        const client = clients.find((item) => item.id === Number(value));
        if (client) {
            setBillToName([client.firstName, client.lastName].filter(Boolean).join(' '));
            setBillToEmail(client.email ?? '');
        }
    };

    const selectGroup = (index: number, value: string) => {
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
    };

    const selectBusinessBrand = (value: string) => {
        setBusinessBrandId(value);
        const brand = brands.find((item) => item.id === Number(value));
        if (brand) {
            setIssuerAddress(brandAddress(brand));
            setAddressSource('brand');
        }
    };

    const selectAddressSource = (value: string) => {
        setAddressSource(value);
        if (value === 'brand') {
            setIssuerAddress(brandAddress(brands.find((brand) => brand.id === Number(businessBrandId))));
        } else if (value.startsWith('branch:')) {
            const branch = branches.find((item) => item.id === Number(value.slice('branch:'.length)));
            if (branch) setIssuerAddress(branchAddress(branch));
        }
    };

    const submit = async () => {
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
        } catch (error: any) {
            toast.error(error?.response?.data?.message ?? 'Не удалось сохранить инвойс');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <div className={s.modal}>
                <h2>{editInvoice ? `РЕДАКТИРОВАТЬ ${editInvoice.number}` : paidMode ? 'ЧЕРНОВИК ОПЛАЧЕННОГО ИНВОЙСА' : 'НОВЫЙ ИНВОЙС'}</h2>
                <div className={s.grid}>
                    <label>Бренд / проект
                        <select value={businessBrandId} onChange={(event) => selectBusinessBrand(event.target.value)}>
                            <option value="">Реквизиты вручную</option>
                            {brands.map((brand) => (
                                <option key={brand.id} value={brand.id}>
                                    {brand.name}{brand.isDefault ? ' · по умолчанию' : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>Ученик
                        <select value={clientId} onChange={(event) => selectClient(event.target.value)}>
                            <option value="">Без привязки</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {[client.firstName, client.lastName].filter(Boolean).join(' ') || `#${client.id}`}
                                </option>
                            ))}
                        </select>
                    </label>
                    {!paidMode && <label>Статус
                        <select value={status} onChange={(event) => setStatus(event.target.value as Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>)}>
                            <option value="DRAFT">Черновик</option>
                            <option value="ISSUED">Выдан</option>
                        </select>
                    </label>}
                    <label>Получатель *
                        <input value={billToName} onChange={(event) => setBillToName(event.target.value)} />
                    </label>
                    <label>Email получателя
                        <input type="email" value={billToEmail} onChange={(event) => setBillToEmail(event.target.value)} />
                    </label>
                    <label>Дата
                        <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
                    </label>
                    {!paidMode && <label>Оплатить до
                        <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                    </label>}
                </div>

                <div className={s.itemsHeader}>
                    <strong>Занятия и услуги</strong>
                    <button onClick={() => setItems((current) => [...current, emptyItem()])}>+ Добавить строку</button>
                </div>
                <div className={s.items}>
                    {items.map((item, index) => (
                        <div className={s.item} key={index}>
                            <select value={item.groupId} onChange={(event) => selectGroup(index, event.target.value)}>
                                <option value="">Вручную</option>
                                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                            </select>
                            <input
                                className={s.description}
                                placeholder="Описание"
                                value={item.description}
                                onChange={(event) => updateItem(index, { description: event.target.value })}
                            />
                            <input
                                placeholder="Период"
                                value={item.period}
                                onChange={(event) => updateItem(index, { period: event.target.value })}
                            />
                            <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })}
                            />
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={item.price}
                                onChange={(event) => updateItem(index, { price: event.target.value })}
                            />
                            {items.length > 1 && (
                                <button className={s.remove} onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>×</button>
                            )}
                        </div>
                    ))}
                </div>

                {paidMode ? (
                    <div className={s.paidOptions}>
                        <strong>Сначала будет создан черновик</strong>
                        <small>Проверьте данные и PDF. После проверки нажмите «Подтвердить как оплаченный» в списке инвойсов и укажите данные оплаты.</small>
                    </div>
                ) : <div className={s.paymentOptions}>
                    <strong>Оплата Mollie в инвойсе</strong>
                    <label>
                        <input type="checkbox" checked={showPaymentButton} onChange={(event) => setShowPaymentButton(event.target.checked)} />
                        Показывать кнопку «Оплатить»
                    </label>
                    <label>
                        <input type="checkbox" checked={showPaymentQr} onChange={(event) => setShowPaymentQr(event.target.checked)} />
                        Показывать QR-код оплаты
                    </label>
                </div>}

                <details className={s.details}>
                    <summary>Реквизиты и примечание</summary>
                    <div className={s.grid}>
                        <label>Компания<input value={issuerName} onChange={(event) => setIssuerName(event.target.value)} /></label>
                        <label>Email<input value={issuerEmail} onChange={(event) => setIssuerEmail(event.target.value)} /></label>
                        <label>Источник адреса
                            <select value={addressSource} onChange={(event) => selectAddressSource(event.target.value)}>
                                <option value="manual">Другой адрес / адрес ивента</option>
                                {businessBrandId && <option value="brand">Адрес бренда / организации</option>}
                                {branches.map((branch) => (
                                    <option key={branch.id} value={`branch:${branch.id}`}>
                                        {branch.name}{branchAddress(branch) ? ` · ${branchAddress(branch)}` : ''}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>Адрес в инвойсе
                            <input
                                value={issuerAddress}
                                placeholder="Введите адрес филиала или ивента"
                                onChange={(event) => {
                                    setIssuerAddress(event.target.value);
                                    setAddressSource('manual');
                                }}
                            />
                        </label>
                        <label>Банк<input value={bankName} onChange={(event) => setBankName(event.target.value)} /></label>
                        <label>IBAN<input value={iban} onChange={(event) => setIban(event.target.value)} /></label>
                        <label>Примечание<input value={note} onChange={(event) => setNote(event.target.value)} /></label>
                    </div>
                </details>

                <div className={s.footer}>
                    <strong>Итого: {(totalCents / 100).toFixed(2)} EUR</strong>
                    <button className={s.submit} disabled={saving} onClick={submit}>
                        {saving ? 'Сохранение...' : editInvoice ? 'Сохранить изменения' : paidMode ? 'Сохранить черновик' : 'Создать инвойс'}
                    </button>
                </div>
            </div>
        </Modal>
    );
});
