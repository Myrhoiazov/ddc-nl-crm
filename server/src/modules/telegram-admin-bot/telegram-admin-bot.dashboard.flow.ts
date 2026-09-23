import { getMollieDashboardSummary } from '../payments/payments.dashboard.service';
import { getClientCount } from '../clients/clients.service';

const money = (value: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value);

// Reuses the exact same backend definitions the web dashboard reads (payments.dashboard.service's
// getMollieDashboardSummary) — never redefines "active subscriptions"/"payments this month"/etc.
// independently, so the two interfaces cannot diverge (spec §7).
export const renderDashboardText = async (): Promise<string> => {
    const [summary, studentCount] = await Promise.all([
        getMollieDashboardSummary(),
        getClientCount(),
    ]);

    return [
        '<b>📊 DDC Dashboard</b>',
        '',
        `👥 Ученики: ${studentCount}`,
        `💳 Платежей в этом месяце: ${summary.paidThisMonth}`,
        `💶 Выручка за месяц: ${money(summary.monthlyRevenue)}`,
        `🔄 Активные подписки: ${summary.activeSubscriptions}`,
        summary.failedPayments > 0 ? `⚠️ Проблемные платежи: ${summary.failedPayments}` : null,
    ].filter((line): line is string => line !== null).join('\n');
};
