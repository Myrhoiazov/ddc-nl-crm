import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';
import { StateView } from '@/shared/ui/StateView';
import { Modal } from '@/shared/ui/Modal/Modal';
import { CreateInvoiceModal } from '../CreateInvoiceModal/CreateInvoiceModal';
import { InvoiceActionModal } from '../InvoiceActionModal/InvoiceActionModal';
import { InvoiceListItem } from './InvoiceListItem';
import { InvoicesPageToolbar } from './InvoicesPageToolbar';
import { InvoicesPagePagination } from './InvoicesPagePagination';
import { useInvoicesPage } from './useInvoicesPage';
import s from './InvoicesPage.module.scss';

const InvoicesPage = memo(() => {
    const { t } = useTranslation();
    const {
        invoices,
        loading,
        modalOpen,
        paidMode,
        editInvoice,
        status,
        setStatus,
        query,
        setQuery,
        appliedQuery,
        page,
        setPage,
        total,
        totalPages,
        previewUrl,
        previewNumber,
        activeAction,
        setActiveAction,
        fetchInvoices,
        updateStatus,
        handleActionConfirm,
        createMolliePaymentLink,
        previewPdf,
        downloadPdf,
        closePreview,
        sendEmail,
        closeModal,
        applySearch,
        resetSearch,
        openCreateModal,
        openEditModal,
    } = useInvoicesPage();

    const pagination = (
        <InvoicesPagePagination page={page} totalPages={totalPages} total={total} loading={loading} onPageChange={setPage} />
    );

    return (
        <Page>
            <InvoicesPageToolbar
                query={query}
                appliedQuery={appliedQuery}
                status={status}
                onQueryChange={setQuery}
                onApplySearch={applySearch}
                onResetSearch={resetSearch}
                onStatusChange={(value) => { setPage(1); setStatus(value); }}
                onOpenCreateModal={openCreateModal}
            />

            {loading ? (
                <ListSkeleton rows={4} height={104} />
            ) : invoices.length === 0 ? (
                <StateView
                    className={s.empty}
                    title={appliedQuery ? 'По вашему запросу ничего не найдено' : 'Инвойсов пока нет'}
                    text={appliedQuery
                        ? 'Попробуйте изменить имя, email, номер или транзакцию.'
                        : 'Создайте первый черновик, проверьте данные и затем выставьте инвойс.'}
                />
            ) : (
                <>
                    {pagination}
                    <div className={s.list}>
                        {invoices.map((invoice) => (
                            <InvoiceListItem
                                key={invoice.id}
                                invoice={invoice}
                                onEdit={openEditModal}
                                onPreviewPdf={previewPdf}
                                onDownloadPdf={downloadPdf}
                                onSendEmail={sendEmail}
                                onCreateMolliePaymentLink={createMolliePaymentLink}
                                onSetActiveAction={setActiveAction}
                                onUpdateStatus={updateStatus}
                            />
                        ))}
                    </div>
                    {pagination}
                </>
            )}

            <CreateInvoiceModal
                isOpen={modalOpen}
                onClose={closeModal}
                onSaved={fetchInvoices}
                editInvoice={editInvoice}
                paidMode={paidMode}
            />

            <InvoiceActionModal
                action={activeAction}
                onConfirm={handleActionConfirm}
                onClose={() => setActiveAction(null)}
            />

            <Modal isOpen={Boolean(previewUrl)} onClose={closePreview} lazy>
                <div className={s.previewModal}>
                    <div>
                        <strong>{previewNumber}</strong>
                        <button onClick={closePreview}>{t('Закрыть')}</button>
                    </div>
                    {previewUrl && <iframe title={`PDF ${previewNumber}`} src={previewUrl} />}
                </div>
            </Modal>
        </Page>
    );
});

export default InvoicesPage;
