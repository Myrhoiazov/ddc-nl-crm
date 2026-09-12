import express from "express";
import authinticationRouter from "./router.Auth";
import usersRouter from "./router.Users";
import profileRouter from './router.Profiles'
import clientsRouter from '../modules/clients/clients.routes'
import commentsRouter from '../modules/comments/comments.routes'
import transactionsRouter from './router.Transactions'
import instagramRouter from '../modules/communication/instagram/instagram.routes'
import mollieRouter from './router.Mollie'
import scheduleRouter from '../modules/schedule/schedule.routes'
import companyRouter from '../modules/company/company.routes'
import invoicesRouter from './router.Invoices'
import emailRouter from '../modules/communication/email/email.routes'
import searchRouter from '../modules/search/search.routes'
import paymentRemindersRouter from './router.PaymentReminders'
import healthRouter from './router.Health'
import authSecurityEventsRouter from './router.AuthSecurityEvents'

const router = express.Router();

export default (): express.Router => {
    router.use('/health', healthRouter)
    router.use('/auth', authinticationRouter)
    router.use('/users', usersRouter)
    router.use('/clients', clientsRouter)
    router.use('/profile', profileRouter)
    router.use('/comments', commentsRouter)
    router.use('/transactions', transactionsRouter)
    router.use('/mollie', mollieRouter)
    router.use('/schedule', scheduleRouter)
    router.use('/company', companyRouter)
    router.use('/invoices', invoicesRouter)
    router.use('/email', emailRouter)
    router.use('/search', searchRouter)
    router.use('/payment-reminders', paymentRemindersRouter)
    router.use('/auth-security-events', authSecurityEventsRouter)

    router.use('/instagram', instagramRouter)

    return router;
}
