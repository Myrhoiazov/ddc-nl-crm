import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Mandate, MandateList } from '@/entities/Mandate';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { MandateDocumentsPanel } from './MandateDocuments/MandateDocumentsPanel';
import { useMandateDocuments } from './MandateDocuments/useMandateDocuments';

interface CustomerMandatesSectionProps {
    customerId: string;
    version: number;
    mandates: Mandate[];
    isLoading: boolean;
    onRevokeMandate: (mandate: Mandate) => void;
}

export const CustomerMandatesSection = memo((props: CustomerMandatesSectionProps) => {
    const { customerId, version, mandates, isLoading, onRevokeMandate } = props;
    const { t } = useTranslation();
    const { documentsByMandate, busyMandateId, onUpload, onDownload, onDelete } = useMandateDocuments(customerId, version);

    return (
        <MandateList
            mandates={mandates} isLoading={isLoading}
            renderAction={(mandate) => mandate.status === 'valid' ? (
                <Button theme={ButtonTheme.OUTLINE_RED} onClick={() => onRevokeMandate(mandate)}>
                    {t('Отозвать')}
                </Button>
            ) : null}
            renderDetails={(mandate) => mandate.id ? (
                <MandateDocumentsPanel
                    mandateId={mandate.id}
                    documents={documentsByMandate[mandate.id] ?? []}
                    isBusy={busyMandateId === mandate.id}
                    onUpload={onUpload} onDownload={onDownload} onDelete={onDelete}
                />
            ) : null}
        />
    );
});
