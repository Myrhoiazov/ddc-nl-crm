// Конфигурация подписи билетов. Секрет приходит только из окружения; version позволяет
// хранить билеты, выданные разными ключами, без перевыпуска при ротации.

export interface TicketTokenConfig {
    secret: string;
    version: number;
}
