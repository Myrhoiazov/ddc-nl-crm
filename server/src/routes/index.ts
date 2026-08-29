import express from "express";
import authinticationRouter from "./router.Auth";
import usersRouter from "./router.Users";
import profileRouter from './router.Profiles'
import clientsRouter from './router.Clients'
import commentsRouter from './router.Comments'
import transactionsRouter from './router.Transactions'
import instagramRouter from './router.Instagram'
import mollieRouter from './router.Mollie'
import scheduleRouter from './router.Schedule'
import companyRouter from './router.Company'
import invoicesRouter from './router.Invoices'
import emailRouter from './router.Email'
import searchRouter from './router.Search'
import paymentRemindersRouter from './router.PaymentReminders'
import healthRouter from './router.Health'

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

    router.use('/instagram', instagramRouter)

    return router;
}
