import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import * as z from "zod";
import { commercialDocuments } from "./commercialDocuments";
import { customers } from "./customer";
import { timestamps, uuidPk } from "./utils";

export const AR_DOCUMENT_TYPES = [
	"invoice",
	"debit_memo",
	"finance_charge",
	"adjustment",
] as const;

export const AR_STATUSES = [
	"open",
	"partial",
	"paid",
	"overdue",
	"written_off",
	"disputed",
] as const;

export const COLLECTION_STATUSES = [
	"normal",
	"reminder_sent",
	"follow_up",
	"collection_agency",
	"legal",
] as const;

export const AGING_BUCKETS = [
	"current",
	"1-30",
	"31-60",
	"61-90",
	"90+",
] as const;

export const PAYMENT_METHODS = [
	"cash",
	"check",
	"bank_transfer",
	"credit_card",
	"debit_card",
	"wire",
	"mobile_payment",
	"store_credit",
] as const;

export const paymentMethodDetailsSchema = z.object({
	checkNumber: z.string().optional(),
	bankName: z.string().optional(),
	checkDate: z.string().optional(),
	referenceNumber: z.string().optional(),
	creditCardLast4: z.string().optional(),
	authorizationCode: z.string().optional(),
	transactionId: z.string().optional(),
});

export type PaymentMethodDetails = z.infer<typeof paymentMethodDetailsSchema>;

export const accountsReceivable = pgTable(
	"accounts_receivable",
	{
		id: uuidPk("id"),
		organizationId: text("organization_id").notNull(),

		documentNumber: text("document_number").notNull(),
		documentType: text("document_type", { enum: AR_DOCUMENT_TYPES })
			.default("invoice")
			.notNull(),

		customerId: uuid("customer_id")
			.references(() => customers.id)
			.notNull(),
		invoiceId: uuid("invoice_id").references(() => commercialDocuments.id),
		commercialDocumentId: uuid("commercial_document_id").references(
			() => commercialDocuments.id,
		),

		status: text("status", { enum: AR_STATUSES }).default("open").notNull(),

		originalAmount: numeric("original_amount", {
			precision: 18,
			scale: 2,
		}).notNull(),
		amountPaid: numeric("amount_paid", { precision: 18, scale: 2 })
			.default("0")
			.notNull(),
		amountRemaining: numeric("amount_remaining", {
			precision: 18,
			scale: 2,
		}).notNull(),

		discountAvailable: numeric("discount_available", {
			precision: 18,
			scale: 2,
		})
			.default("0")
			.notNull(),
		discountDueDate: text("discount_due_date"),
		discountTaken: numeric("discount_taken", {
			precision: 18,
			scale: 2,
		})
			.default("0")
			.notNull(),

		financeCharges: numeric("finance_charges", {
			precision: 18,
			scale: 2,
		})
			.default("0")
			.notNull(),

		documentDate: text("document_date").notNull(),
		dueDate: text("due_date").notNull(),
		paidAt: text("paid_at"),
		overdueSince: text("overdue_since"),

		agingBucket: text("aging_bucket", { enum: AGING_BUCKETS }),

		description: text("description"),
		reference: text("reference"),

		isDisputed: boolean("is_disputed").default(false),
		disputeReason: text("dispute_reason"),
		disputeDate: text("dispute_date"),

		collectionStatus: text("collection_status", { enum: COLLECTION_STATUSES })
			.default("normal")
			.notNull(),
		lastReminderDate: text("last_reminder_date"),
		reminderCount: integer("reminder_count").default(0),

		createdBy: text("created_by").notNull(),

		...timestamps,
	},
	(t) => [
		unique().on(t.organizationId, t.documentNumber),
		index().on(t.customerId, t.status),
		index().on(t.dueDate),
		index().on(t.agingBucket),
		index().on(t.status),
	],
);

export const payments = pgTable(
	"payment",
	{
		id: uuidPk("id"),
		organizationId: text("organization_id").notNull(),

		paymentNumber: text("payment_number").notNull(),
		paymentDate: text("payment_date").notNull(),

		customerId: uuid("customer_id")
			.references(() => customers.id)
			.notNull(),

		paymentMethod: text("payment_method", { enum: PAYMENT_METHODS }).notNull(),
		paymentMethodDetails: jsonb("payment_method_details")
			.default(sql`'{}'::jsonb`)
			.$type<PaymentMethodDetails>(),

		totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull(),
		unappliedAmount: numeric("unapplied_amount", {
			precision: 18,
			scale: 2,
		})
			.default("0")
			.notNull(),
		currency: text("currency").default("USD").notNull(),
		exchangeRate: numeric("exchange_rate", { precision: 18, scale: 6 })
			.default("1")
			.notNull(),

		status: text("status").default("posted").notNull(),

		depositAccountId: text("deposit_account_id"),
		depositDate: text("deposit_date"),

		notes: text("notes"),

		createdBy: text("created_by").notNull(),
		voidedBy: text("voided_by"),
		voidedAt: text("voided_at"),
		voidReason: text("void_reason"),

		...timestamps,
	},
	(t) => [unique().on(t.organizationId, t.paymentNumber)],
);

export const paymentApplications = pgTable(
	"payment_application",
	{
		id: uuidPk("id"),

		paymentId: uuid("payment_id")
			.references(() => payments.id, { onDelete: "cascade" })
			.notNull(),
		arId: uuid("ar_id")
			.references(() => accountsReceivable.id, { onDelete: "cascade" })
			.notNull(),

		amountApplied: numeric("amount_applied", {
			precision: 18,
			scale: 2,
		}).notNull(),
		discountTaken: numeric("discount_taken", {
			precision: 18,
			scale: 2,
		})
			.default("0")
			.notNull(),
		writeOffAmount: numeric("write_off_amount", {
			precision: 18,
			scale: 2,
		})
			.default("0")
			.notNull(),

		appliedAt: text("applied_at").notNull(),
		appliedBy: text("applied_by").notNull(),

		isReversed: boolean("is_reversed").default(false),
		reversedAt: text("reversed_at"),
		reversalReason: text("reversal_reason"),

		...timestamps,
	},
	(t) => [index().on(t.paymentId), index().on(t.arId)],
);

export const creditMemos = pgTable(
	"credit_memo",
	{
		id: uuidPk("id"),
		organizationId: text("organization_id").notNull(),

		documentNumber: text("document_number").notNull(),
		customerId: uuid("customer_id")
			.references(() => customers.id)
			.notNull(),

		originalArId: uuid("original_ar_id").references(
			() => accountsReceivable.id,
		),

		reasonCode: text("reason_code").notNull(),
		reasonDescription: text("reason_description"),

		totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull(),
		appliedAmount: numeric("applied_amount", {
			precision: 18,
			scale: 2,
		})
			.default("0")
			.notNull(),
		remainingAmount: numeric("remaining_amount", {
			precision: 18,
			scale: 2,
		}).notNull(),

		status: text("status").default("open").notNull(),

		refundMethod: text("refund_method"),
		refundReference: text("refund_reference"),
		refundedAt: text("refunded_at"),

		documentDate: text("document_date").notNull(),
		expirationDate: text("expiration_date"),

		...timestamps,
	},
	(t) => [unique().on(t.organizationId, t.documentNumber)],
);

export const COLLECTION_ACTIVITY_TYPES = [
	"phone_call",
	"email",
	"letter",
	"visit",
	"promise_to_pay",
	"payment_received",
	"dispute_raised",
	"dispute_resolved",
	"note",
] as const;

export const collectionActivities = pgTable(
	"collection_activity",
	{
		id: uuidPk("id"),
		organizationId: text("organization_id").notNull(),

		customerId: uuid("customer_id")
			.references(() => customers.id)
			.notNull(),
		arId: uuid("ar_id").references(() => accountsReceivable.id),

		activityType: text("activity_type", {
			enum: COLLECTION_ACTIVITY_TYPES,
		}).notNull(),
		activityDate: text("activity_date").notNull(),

		contactName: text("contact_name"),
		contactMethod: text("contact_method"),

		promisedAmount: numeric("promised_amount", { precision: 18, scale: 2 }),
		promisedDate: text("promised_date"),
		promiseKept: boolean("promise_kept"),

		subject: text("subject"),
		notes: text("notes"),

		followUpDate: text("follow_up_date"),
		followUpCompleted: boolean("follow_up_completed").default(false),

		assignedTo: text("assigned_to"),
		completedBy: text("completed_by"),

		...timestamps,
	},
	(t) => [
		index().on(t.customerId),
		index().on(t.arId),
		index().on(t.activityDate),
	],
);

export const accountsReceivableRelations = relations(
	accountsReceivable,
	({ one, many }) => ({
		customer: one(customers, {
			fields: [accountsReceivable.customerId],
			references: [customers.id],
		}),
		invoice: one(commercialDocuments, {
			fields: [accountsReceivable.invoiceId],
			references: [commercialDocuments.id],
		}),
		applications: many(paymentApplications),
	}),
);

export const paymentsRelations = relations(payments, ({ one, many }) => ({
	customer: one(customers, {
		fields: [payments.customerId],
		references: [customers.id],
	}),
	applications: many(paymentApplications),
}));

export const paymentApplicationsRelations = relations(
	paymentApplications,
	({ one }) => ({
		payment: one(payments, {
			fields: [paymentApplications.paymentId],
			references: [payments.id],
		}),
		ar: one(accountsReceivable, {
			fields: [paymentApplications.arId],
			references: [accountsReceivable.id],
		}),
	}),
);
