import { getAllClients } from '../clients/clients.service';

const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const MAX_RESULTS_SHOWN = 8;

// Supporting navigation only (spec §8) — reuses getAllClients' existing free-text `_q` match
// (name/email/phone) rather than the broader cross-domain `search` module, which would also
// return Mollie payments/groups/branches unrelated to "find a student."
export const renderStudentSearchResults = async (query: string): Promise<string> => {
    const trimmed = query.trim();
    if (!trimmed) return 'Введите имя, email или телефон для поиска.';

    const clients = await getAllClients({ _q: trimmed });
    if (clients.length === 0) return `По запросу «${escapeHtml(trimmed)}» ничего не найдено.`;

    const rows = clients.slice(0, MAX_RESULTS_SHOWN).map((client) => {
        const name = [client.firstName, client.lastName].filter(Boolean).join(' ') || '(без имени)';
        const contact = [client.email, client.phoneNumber].filter(Boolean).join(' · ');
        const mollieLinked = client.mollieLinks?.length ? '✅' : '❌';
        return [
            `👤 <b>${escapeHtml(name)}</b> (id ${client.id})`,
            contact ? escapeHtml(contact) : null,
            `Mollie: ${mollieLinked}`,
        ].filter(Boolean).join('\n');
    });

    const header = `Найдено: ${clients.length}${clients.length > MAX_RESULTS_SHOWN ? ` (показаны первые ${MAX_RESULTS_SHOWN})` : ''}`;
    return [header, '', rows.join('\n\n')].join('\n');
};
