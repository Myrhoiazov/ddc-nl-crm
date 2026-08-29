import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { $apiPrivate } from '@/shared/api/api';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import s from './MollieMain.module.scss';

export interface OrganizationProfile {
    id: string;
    businessCategory: string;
    categoryCode: number;
    countriesOfActivity: string[];
    createdAt: string;
    description: string;
    email: string;
    mode: 'live' | 'test';
    name: string;
    phone: string;
    status: 'verified' | 'unverified' | string;
    website?: string;
}

export const MollieMain = memo(() => {
    const [organizations, setOrganizations] = useState<OrganizationProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const { t } = useTranslation('home');

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(false);

            try {
                const response = await $apiPrivate.get<OrganizationProfile>('/mollie/organizations');
                setOrganizations([response.data]);
            } catch {
                setError(true);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    return (
        <VStack gap="16" max className={s.MollieMain}>
            <HStack max justify="between" align="center">
                <div>
                    <Text title="Mollie Company" size="m" bold />
                    <Text text="Профиль компании и быстрые действия для Mollie." size="s" className={s.subtitle} />
                </div>
            </HStack>

            {isLoading && <Skeleton width="100%" height={260} border="16px" />}

            {error && (
                <Card padding="24" fullWidth className={s.companyCard}>
                    <Text
                        title="Не удалось загрузить компанию"
                        text="Проверьте подключение Mollie или попробуйте обновить страницу."
                        size="m"
                    />
                </Card>
            )}

            {!isLoading && !error && organizations.length === 0 && (
                <Card padding="24" fullWidth className={s.companyCard}>
                    <Text title={t('No organizations found')} size="m" />
                </Card>
            )}

            {!isLoading && !error && organizations.map((org) => (
                <Card key={org.id} padding="24" fullWidth className={s.companyCard}>
                    <VStack gap="16" max>
                        <div className={s.companyHeader}>
                            <div>
                                <Text title={org.name} size="m" bold />
                                <Text text={org.description || org.id} size="s" className={s.subtitle} />
                            </div>
                            <span className={`${s.badge} ${org.status === 'verified' ? s.verified : ''}`}>
                                {org.status}
                            </span>
                        </div>
                        <div className={s.detailsGrid}>
                            <div className={s.detailItem}>
                                <span className={s.label}>Email</span>
                                <span className={s.value}>{org.email || '—'}</span>
                            </div>
                            <div className={s.detailItem}>
                                <span className={s.label}>Phone</span>
                                <span className={s.value}>{org.phone || '—'}</span>
                            </div>
                            <div className={s.detailItem}>
                                <span className={s.label}>Mode</span>
                                <span className={s.value}>{org.mode}</span>
                            </div>
                            <div className={s.detailItem}>
                                <span className={s.label}>Business category</span>
                                <span className={s.value}>{org.businessCategory || '—'}</span>
                            </div>
                            <div className={s.detailItem}>
                                <span className={s.label}>Category code</span>
                                <span className={s.value}>{org.categoryCode || '—'}</span>
                            </div>
                            <div className={s.detailItem}>
                                <span className={s.label}>Countries</span>
                                <span className={s.value}>{org.countriesOfActivity?.join(', ') || '—'}</span>
                            </div>
                            <div className={s.detailItem}>
                                <span className={s.label}>Created</span>
                                <span className={s.value}>{new Date(org.createdAt).toLocaleDateString('nl-NL')}</span>
                            </div>
                            <div className={s.detailItem}>
                                <span className={s.label}>Website</span>
                                <span className={s.value}>{org.website || '—'}</span>
                            </div>
                        </div>
                    </VStack>
                </Card>
            ))}

        </VStack>
    );
});
