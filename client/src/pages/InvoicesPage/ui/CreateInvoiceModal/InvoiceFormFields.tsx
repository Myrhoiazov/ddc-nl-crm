import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { InvoiceBusinessBrand, InvoiceClient, InvoiceStatus } from '../../model/types';
import s from './CreateInvoiceModal.module.scss';

interface InvoiceFormFieldsProps {
    brands: InvoiceBusinessBrand[];
    clients: InvoiceClient[];
    paidMode: boolean;
    businessBrandId: string;
    clientId: string;
    status: Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>;
    billToName: string;
    billToEmail: string;
    issueDate: string;
    dueDate: string;
    onSelectBrand: (value: string) => void;
    onSelectClient: (value: string) => void;
    onStatusChange: (value: Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>) => void;
    onBillToNameChange: (value: string) => void;
    onBillToEmailChange: (value: string) => void;
    onIssueDateChange: (value: string) => void;
    onDueDateChange: (value: string) => void;
}

export const InvoiceFormFields = memo((props: InvoiceFormFieldsProps) => {
    const { t } = useTranslation();
    const {
        brands, clients, paidMode,
        businessBrandId, clientId, status,
        billToName, billToEmail, issueDate, dueDate,
        onSelectBrand, onSelectClient, onStatusChange,
        onBillToNameChange, onBillToEmailChange, onIssueDateChange, onDueDateChange,
    } = props;

    return (
        <div className={s.grid}>
            <label>{t('Бренд / проект')}
                <select value={businessBrandId} onChange={(event) => onSelectBrand(event.target.value)}>
                    <option value="">{t('Реквизиты вручную')}</option>
                    {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                            {brand.name}{brand.isDefault ? ' · по умолчанию' : ''}
                        </option>
                    ))}
                </select>
            </label>
            <label>{t('Ученик')}
                <select value={clientId} onChange={(event) => onSelectClient(event.target.value)}>
                    <option value="">{t('Без привязки')}</option>
                    {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                            {[client.firstName, client.lastName].filter(Boolean).join(' ') || `#${client.id}`}
                        </option>
                    ))}
                </select>
            </label>
            {!paidMode && <label>{t('Статус')}
                <select value={status} onChange={(event) => onStatusChange(event.target.value as Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>)}>
                    <option value="DRAFT">{t('Черновик')}</option>
                    <option value="ISSUED">{t('Выдан')}</option>
                </select>
            </label>}
            <label>{t('Получатель *')}
                <input value={billToName} onChange={(event) => onBillToNameChange(event.target.value)} />
            </label>
            <label>{t('Email получателя')}
                <input type="email" value={billToEmail} onChange={(event) => onBillToEmailChange(event.target.value)} />
            </label>
            <label>{t('Дата')}
                <input type="date" value={issueDate} onChange={(event) => onIssueDateChange(event.target.value)} />
            </label>
            {!paidMode && <label>{t('Оплатить до')}
                <input type="date" value={dueDate} onChange={(event) => onDueDateChange(event.target.value)} />
            </label>}
        </div>
    );
});
