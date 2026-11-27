import express from "express";
import { asyncHandler, isAuthenticated, requireStaff } from "../auth/auth.middleware";
import * as mollieController from "./payments.controller";
import * as mandateDocumentsController from "./payments.mandate-documents.controller";

const router = express.Router();

router.get("/connect", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.connectMollieController));
router.get("/callback", asyncHandler(mollieController.mollieCallbackController));
router.get("/connection/status", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieConnectionStatusController));
router.post("/telegram/test", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieTelegramTestController));
router.post("/connection/disconnect", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieDisconnectController));
router.get("/organizations", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieGetOrganizationsController));
router.get("/dashboard/summary", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieDashboardSummaryController));

router.post("/sync", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieSyncAllController));
router.post("/sync/customers", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieSyncCustomersController));
router.post("/sync/payments", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieSyncPaymentsController));
router.post("/sync/mandates", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieSyncMandatesController));
router.post("/sync/subscriptions", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieSyncSubscriptionsController));

router.get("/incidents", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieGetPaymentIncidentsController));
router.post("/incidents/:incidentKey/resolve", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieResolveIncidentController));
router.get("/payments", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieGetPaymentsController));
router.get("/payments/matrix", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieGetPaymentsMatrixController));
router.get("/payments/export.csv", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieExportPaymentsController));
router.get("/payments/:paymentId/invoice.pdf", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieDownloadPaymentInvoiceController));
router.post("/payments/:paymentId/cancel", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieCancelPaymentController));
// router.get('/payments/:id', asyncHandler(mollieController.getPaymentById));

router.get("/customers", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieGetCustomersController));
router.get("/customers/active-subscriptions/export.csv", asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieExportActiveSubscriptionsController));
router.get('/customers/edit-data/:customerId', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieGetCustomerEditData));
router.get('/customers/:customerId', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieGetCustomerFullInfo));
router.put('/customers/:customerId', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.updateCustomerController));
router.delete('/customers/:customerId', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.deleteCustomerController));
router.post('/customers', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.createCustomerController));
router.post('/customers/:customerId/payment-link', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieCreateCustomerPaymentLinkController));
router.post('/customers/:customerId/student-links', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.createCustomerStudentLinkController));
router.get('/customers/:customerId/student-links', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieGetCustomerStudentLinksController));
router.delete('/customers/:customerId/student-links/:linkId', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.deleteCustomerStudentLinkController));
router.get('/customers/:customerId/payments', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieGetCustomerPaymentsController));

router.get('/customers/:customerId/mandates', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieGetMandatesController));
router.get('/customers/:customerId/mandates/:mandateId', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieGetMandateByIdController));
router.delete('/customers/:customerId/mandates/:mandateId', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieRevokeMandateController));
router.get('/customers/:customerId/mandate-documents', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mandateDocumentsController.mollieGetCustomerMandateDocumentsController));
router.post('/customers/:customerId/mandates/:mandateId/documents', asyncHandler(isAuthenticated), requireStaff, mandateDocumentsController.uploadMandateDocumentFile, asyncHandler(mandateDocumentsController.mollieUploadMandateDocumentController));
router.get('/mandate-documents/:documentId/download', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mandateDocumentsController.mollieDownloadMandateDocumentController));
router.delete('/mandate-documents/:documentId', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mandateDocumentsController.mollieDeleteMandateDocumentController));
router.post('/mandates', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieCreateMandateController));
router.post('/mandates/:customerId/subscriptions', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieCreateMandateSubscriptionController));
router.get('/customers/:customerId/subscriptions', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieGetAllSubscriptionByCustomerIdController));
router.get('/mandates/:customerId', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieGetMandatesController));


router.delete('/subscriptions/:subscriptionId', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieDeleteSubscriptionByIdController));
router.patch('/subscriptions/:subscriptionId', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieUpdateSubscriptionController));
router.post('/subscriptions/:subscriptionId/restart', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieRestartSubscriptionController));
router.get('/subscriptions/upcoming', asyncHandler(isAuthenticated), requireStaff, asyncHandler(mollieController.mollieGetUpcomingSubscriptionsController));


// router.get('/products', asyncHandler(mollieController.getAllProducts));
// router.get('/products/:id', asyncHandler(mollieController.getProductById));

router.post("/webhook", asyncHandler(mollieController.webhookMollieController));

export default router;
