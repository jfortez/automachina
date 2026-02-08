import { sql } from "drizzle-orm";
import {
	boolean,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	unique,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { uuidPk } from "./utils";

export const CUSTOMER_CREDIT_STATUSES = [
	"pending",
	"approved",
	"suspended",
	"blocked",
] as const;

export const CUSTOMER_RISK_LEVELS = ["low", "medium", "high"] as const;

export const customers = pgTable(
	"customer",
	{
		id: uuidPk("id"),
		organizationId: text("organization_id")
			.references(() => organization.id)
			.notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		contactInfo: jsonb("contact_info").default(sql`'{}'::jsonb`).notNull(),

		creditStatus: text("credit_status", { enum: CUSTOMER_CREDIT_STATUSES })
			.default("pending")
			.notNull(),
		creditLimit: numeric("credit_limit", { precision: 18, scale: 2 }),
		currentBalance: numeric("current_balance", { precision: 18, scale: 2 })
			.default("0")
			.notNull(),
		paymentTerms: text("payment_terms").default("net_30"),
		paymentTermsDays: integer("payment_terms_days").default(30),
		earlyPaymentDiscountPercent: numeric("early_payment_discount_pct", {
			precision: 5,
			scale: 2,
		}),
		earlyPaymentDiscountDays: integer("early_payment_discount_days"),
		financeChargePercent: numeric("finance_charge_pct", {
			precision: 5,
			scale: 2,
		}).default("0"),
		creditApprovedBy: text("credit_approved_by"),
		creditApprovedAt: text("credit_approved_at"),
		creditApprovalNotes: text("credit_approval_notes"),
		riskLevel: text("risk_level", { enum: CUSTOMER_RISK_LEVELS }).default(
			"medium",
		),
		lastPaymentDate: text("last_payment_date"),
		lastPaymentAmount: numeric("last_payment_amount", {
			precision: 18,
			scale: 2,
		}),
		averageDaysToPay: integer("average_days_to_pay"),
		consolidateInvoices: boolean("consolidate_invoices").default(false),
		consolidationFrequency: text("consolidation_frequency"),
	},
	(t) => [unique().on(t.organizationId, t.code)],
);
