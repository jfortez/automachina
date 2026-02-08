import { z } from "zod";
import {
	AGING_BUCKETS,
	AR_DOCUMENT_TYPES,
	AR_STATUSES,
	COLLECTION_ACTIVITY_TYPES,
	COLLECTION_STATUSES,
	PAYMENT_METHODS,
	paymentMethodDetailsSchema,
} from "@/db/schema/accountsReceivable";

const createAccountReceivable = z.object({
	documentNumber: z.string(),
	documentType: z.enum(AR_DOCUMENT_TYPES).default("invoice"),
	customerId: z.string(),
	invoiceId: z.string().optional(),
	commercialDocumentId: z.string().optional(),
	originalAmount: z.number().positive(),
	amountRemaining: z.number().positive(),
	discountAvailable: z.number().min(0).default(0),
	discountDueDate: z.string().optional(),
	documentDate: z.string(),
	dueDate: z.string(),
	description: z.string().optional(),
	reference: z.string().optional(),
});

const updateAccountReceivable = z.object({
	id: z.string(),
	status: z.enum(AR_STATUSES).optional(),
	dueDate: z.string().optional(),
	description: z.string().optional(),
	reference: z.string().optional(),
	isDisputed: z.boolean().optional(),
	disputeReason: z.string().optional(),
	collectionStatus: z.enum(COLLECTION_STATUSES).optional(),
});

const listAccountsReceivable = z.object({
	customerId: z.string().optional(),
	status: z.enum(AR_STATUSES).optional(),
	documentType: z.enum(AR_DOCUMENT_TYPES).optional(),
	agingBucket: z.enum(AGING_BUCKETS).optional(),
	isOverdue: z.boolean().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
});

const getAccountReceivable = z.object({
	id: z.string(),
});

const getCustomerAging = z.object({
	customerId: z.string(),
});

const applyPayment = z.object({
	paymentId: z.string(),
	arId: z.string(),
	amountApplied: z.number().positive(),
	discountTaken: z.number().min(0).default(0),
	writeOffAmount: z.number().min(0).default(0),
});

const createPayment = z.object({
	paymentNumber: z.string(),
	paymentDate: z.string(),
	customerId: z.string(),
	paymentMethod: z.enum(PAYMENT_METHODS),
	paymentMethodDetails: paymentMethodDetailsSchema.optional(),
	totalAmount: z.number().positive(),
	currency: z.string().default("USD"),
	exchangeRate: z.number().positive().default(1),
	depositAccountId: z.string().optional(),
	depositDate: z.string().optional(),
	notes: z.string().optional(),
	applications: z
		.array(
			z.object({
				arId: z.string(),
				amountApplied: z.number().positive(),
				discountTaken: z.number().min(0).default(0),
				writeOffAmount: z.number().min(0).default(0),
			}),
		)
		.optional(),
});

const listPayments = z.object({
	customerId: z.string().optional(),
	status: z.enum(["posted", "voided"]).optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
});

const getPayment = z.object({
	id: z.string(),
});

const voidPayment = z.object({
	id: z.string(),
	reason: z.string(),
});

const createCreditMemo = z.object({
	documentNumber: z.string(),
	customerId: z.string(),
	originalArId: z.string().optional(),
	reasonCode: z.string(),
	reasonDescription: z.string().optional(),
	totalAmount: z.number().positive(),
	documentDate: z.string(),
	expirationDate: z.string().optional(),
});

const applyCreditMemo = z.object({
	creditMemoId: z.string(),
	arId: z.string(),
	amount: z.number().positive(),
});

const listCreditMemos = z.object({
	customerId: z.string().optional(),
	status: z.enum(["open", "applied", "refunded", "expired"]).optional(),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
});

const createCollectionActivity = z.object({
	customerId: z.string(),
	arId: z.string().optional(),
	activityType: z.enum(COLLECTION_ACTIVITY_TYPES),
	activityDate: z.string(),
	contactName: z.string().optional(),
	contactMethod: z.string().optional(),
	promisedAmount: z.number().positive().optional(),
	promisedDate: z.string().optional(),
	subject: z.string().optional(),
	notes: z.string(),
	followUpDate: z.string().optional(),
	assignedTo: z.string().optional(),
});

const listCollectionActivities = z.object({
	customerId: z.string().optional(),
	arId: z.string().optional(),
	activityType: z.enum(COLLECTION_ACTIVITY_TYPES).optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
});

export type CreateAccountReceivableInput = z.infer<
	typeof createAccountReceivable
>;
export type UpdateAccountReceivableInput = z.infer<
	typeof updateAccountReceivable
>;
export type ListAccountsReceivableInput = z.infer<
	typeof listAccountsReceivable
>;
export type GetAccountReceivableInput = z.infer<typeof getAccountReceivable>;
export type GetCustomerAgingInput = z.infer<typeof getCustomerAging>;
export type ApplyPaymentInput = z.infer<typeof applyPayment>;
export type CreatePaymentInput = z.infer<typeof createPayment>;
export type ListPaymentsInput = z.infer<typeof listPayments>;
export type GetPaymentInput = z.infer<typeof getPayment>;
export type VoidPaymentInput = z.infer<typeof voidPayment>;
export type CreateCreditMemoInput = z.infer<typeof createCreditMemo>;
export type ApplyCreditMemoInput = z.infer<typeof applyCreditMemo>;
export type ListCreditMemosInput = z.infer<typeof listCreditMemos>;
export type CreateCollectionActivityInput = z.infer<
	typeof createCollectionActivity
>;
export type ListCollectionActivitiesInput = z.infer<
	typeof listCollectionActivities
>;

export {
	createAccountReceivable,
	updateAccountReceivable,
	listAccountsReceivable,
	getAccountReceivable,
	getCustomerAging,
	applyPayment,
	createPayment,
	listPayments,
	getPayment,
	voidPayment,
	createCreditMemo,
	applyCreditMemo,
	listCreditMemos,
	createCollectionActivity,
	listCollectionActivities,
};
