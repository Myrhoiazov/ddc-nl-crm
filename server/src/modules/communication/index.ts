export {
    isTelegramConfigured,
    notifyLoginBlocked,
    notifyMolliePayment,
    notifyNewDeviceAfterFailures,
    notifyRoleChanged,
    sendTelegramMessage,
    type TelegramMessageOptions,
} from './telegram/telegram.service';
export {
    notifyNewMollieCustomers,
    notifyNewStudent,
    type NewMollieCustomerNotification,
    type NewStudentSource,
} from './telegram/new-record-notifications.service';
