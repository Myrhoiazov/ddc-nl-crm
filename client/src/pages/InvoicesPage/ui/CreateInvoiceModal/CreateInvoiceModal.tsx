import { memo, useCallback } from 'react';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Invoice } from '../../model/types';
import s from './CreateInvoiceModal.module.scss';
import { useCreateInvoiceModal } from './useCreateInvoiceModal';
import { InvoiceFormFields } from './InvoiceFormFields';
import { InvoiceItemsEditor } from './InvoiceItemsEditor';
import { InvoicePaymentOptions } from './InvoicePaymentOptions';
import { InvoiceIssuerDetails } from './InvoiceIssuerDetails';
import { InvoiceFooter } from './InvoiceFooter';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editInvoice?: Invoice | null;
    paidMode?: boolean;
}

export const CreateInvoiceModal = memo(({ isOpen, onClose, onSaved, editInvoice, paidMode = false }: Props) => {
    const {
        clients, brands, branches, groups,
        businessBrandId, addressSource, clientId,
        billToName, setBillToName, billToEmail, setBillToEmail,
        issueDate, setIssueDate, dueDate, setDueDate,
        status, setStatus,
        issuerName, setIssuerName, issuerAddress, setIssuerAddress, issuerEmail, setIssuerEmail,
        bankName, setBankName, iban, setIban, note, setNote,
        showPaymentButton, setShowPaymentButton, showPaymentQr, setShowPaymentQr,
        items, saving, totalCents,
        updateItem, addItem, removeItem,
        selectClient, selectGroup, selectBusinessBrand, selectAddressSource,
        setAddressSource,
        submit,
    } = useCreateInvoiceModal({ isOpen, onClose, onSaved, editInvoice, paidMode });

    const onManualAddressChange = useCallback((value: string) => {
        setIssuerAddress(value);
        setAddressSource('manual');
    }, [setIssuerAddress, setAddressSource]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <div className={s.modal}>
                <h2>{editInvoice ? `РЕДАКТИРОВАТЬ ${editInvoice.number}` : paidMode ? 'ЧЕРНОВИК ОПЛАЧЕННОГО ИНВОЙСА' : 'НОВЫЙ ИНВОЙС'}</h2>

                <InvoiceFormFields
                    brands={brands}
                    clients={clients}
                    paidMode={paidMode}
                    businessBrandId={businessBrandId}
                    clientId={clientId}
                    status={status}
                    billToName={billToName}
                    billToEmail={billToEmail}
                    issueDate={issueDate}
                    dueDate={dueDate}
                    onSelectBrand={selectBusinessBrand}
                    onSelectClient={selectClient}
                    onStatusChange={setStatus}
                    onBillToNameChange={setBillToName}
                    onBillToEmailChange={setBillToEmail}
                    onIssueDateChange={setIssueDate}
                    onDueDateChange={setDueDate}
                />

                <InvoiceItemsEditor
                    items={items}
                    groups={groups}
                    onAdd={addItem}
                    onRemove={removeItem}
                    onSelectGroup={selectGroup}
                    onUpdateItem={updateItem}
                />

                <InvoicePaymentOptions
                    paidMode={paidMode}
                    showPaymentButton={showPaymentButton}
                    showPaymentQr={showPaymentQr}
                    onPaymentButtonChange={setShowPaymentButton}
                    onPaymentQrChange={setShowPaymentQr}
                />

                <InvoiceIssuerDetails
                    branches={branches}
                    addressSource={addressSource}
                    businessBrandId={businessBrandId}
                    issuerName={issuerName}
                    issuerEmail={issuerEmail}
                    issuerAddress={issuerAddress}
                    bankName={bankName}
                    iban={iban}
                    note={note}
                    onIssuerNameChange={setIssuerName}
                    onIssuerEmailChange={setIssuerEmail}
                    onSelectAddressSource={selectAddressSource}
                    onIssuerAddressChange={onManualAddressChange}
                    onBankNameChange={setBankName}
                    onIbanChange={setIban}
                    onNoteChange={setNote}
                />

                <InvoiceFooter
                    totalCents={totalCents}
                    saving={saving}
                    editInvoice={Boolean(editInvoice)}
                    paidMode={paidMode}
                    onSubmit={submit}
                />
            </div>
        </Modal>
    );
});
