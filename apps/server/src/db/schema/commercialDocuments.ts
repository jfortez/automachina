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
import { customers } from "./customer";
import { product } from "./products";
import { suppliers } from "./suppliers";
import { uom } from "./uom";
import { timestamps, uuidPk } from "./utils";

export const COMMERCIAL_DOCUMENT_TYPES = [
	"invoice",
	"sales_note",
	"proforma",
	"delivery_guide",
	"credit_note",
	"debit_note",
	"purchase_invoice",
] as const;

export const DOCUMENT_STATUSES = [
	"draft",
	"issued",
	"sent",
	"cancelled",
	"rejected",
] as const;

export const ELECTRONIC_STATUSES = [
	"pending",
	"authorized",
	"rejected",
	"not_applicable",
] as const;

export const REASON_CODES = [
	"return",
	"discount",
	"price_adjustment",
	"error_correction",
	"goodwill",
	"promotional",
	"other",
] as const;

export const commercialDocumentsTransportInfoSchema = z.object({
	transportMode: z.enum(["vehicle", "plane", "ship", "train"]),
	vehiclePlate: z.string().optional(),
	driverId: z.string().optional(),
	driverName: z.string().optional(),
	originAddress: z.string(),
	destinationAddress: z.string(),
	transportCompany: z.string().optional(),
	waybillNumber: z.string().optional(),
});

export type CommercialDocumentsTransportInfo = z.infer<
	typeof commercialDocumentsTransportInfoSchema
>;

export const commercialDocumentsTaxBreakdownSchema = z.object({
	taxRuleId: z.string(),
	taxName: z.string(),
	taxPercent: z.number(),
	taxableAmount: z.number(),
	taxAmount: z.number(),
});

export type CommercialDocumentsTaxBreakdown = z.infer<
	typeof commercialDocumentsTaxBreakdownSchema
>;

export const commercialDocumentsDiscountBreakdownSchema = z.object({
	discountRuleId: z.string().optional(),
	discountName: z.string(),
	discountType: z.enum(["percentage", "fixed"]),
	discountValue: z.number(),
	discountAmount: z.number(),
});

export type CommercialDocumentsDiscountBreakdown = z.infer<
	typeof commercialDocumentsDiscountBreakdownSchema
>;

export const commercialDocuments = pgTable(
	"commercial_document",
	{
		id: uuidPk("id"),
		organizationId: text("organization_id").notNull(),

		documentType: text("document_type", {
			enum: COMMERCIAL_DOCUMENT_TYPES,
		}).notNull(),
		documentNumber: text("document_number").notNull(),
		series: text("series").default("001").notNull(),

		authorizationNumber: text("authorization_number"),
		electronicStatus: text("electronic_status", {
			enum: ELECTRONIC_STATUSES,
		}).default("not_applicable"),
		authorizationDate: text("authorization_date"),

		issueDate: text("issue_date").notNull(),
		dueDate: text("due_date"),

		customerId: uuid("customer_id").references(() => customers.id),
		supplierId: uuid("supplier_id").references(() => suppliers.id),

		referenceDocumentId: text("reference_document_id"),
		referenceDocumentNumber: text("reference_document_number"),

		reasonCode: text("reason_code", { enum: REASON_CODES }),
		reasonDescription: text("reason_description"),

		subtotal: numeric("subtotal", { precision: 18, scale: 2 }).notNull(),
		discountTotal: numeric("discount_total", {
			precision: 18,
			scale: 2,
		}).default("0"),
		taxTotal: numeric("tax_total", { precision: 18, scale: 2 }).default("0"),
		total: numeric("total", { precision: 18, scale: 2 }).notNull(),

		taxBreakdown: jsonb("tax_breakdown")
			.default(sql`'[]'::jsonb`)
			.$type<CommercialDocumentsTaxBreakdown[]>(),
		discountBreakdown: jsonb("discount_breakdown")
			.default(sql`'[]'::jsonb`)
			.$type<CommercialDocumentsDiscountBreakdown[]>(),

		currency: text("currency").default("USD").notNull(),

		status: text("status", { enum: DOCUMENT_STATUSES })
			.default("draft")
			.notNull(),

		transportInfo: jsonb("transport_info")
			.default(sql`'{}'::jsonb`)
			.$type<CommercialDocumentsTransportInfo>(),

		xmlContent: text("xml_content"),
		pdfUrl: text("pdf_url"),

		referenceNumber: text("reference_number"),
		orderId: text("order_id"),

		notes: text("notes"),
		terms: text("terms"),

		...timestamps,
	},
	(t) => [
		unique().on(t.organizationId, t.documentType, t.documentNumber),
		index().on(t.organizationId, t.documentType),
		index().on(t.customerId),
		index().on(t.issueDate),
		index().on(t.status),
	],
);

export const commercialDocumentLines = pgTable(
	"commercial_document_line",
	{
		id: uuidPk("id"),
		documentId: uuid("document_id")
			.references(() => commercialDocuments.id, { onDelete: "cascade" })
			.notNull(),

		productId: uuid("product_id").references(() => product.id),
		description: text("description").notNull(),

		quantity: numeric("quantity", { precision: 28, scale: 9 }).notNull(),
		uomCode: text("uom_code").references(() => uom.code),

		unitPrice: numeric("unit_price", { precision: 18, scale: 6 }).notNull(),
		discountPercent: numeric("discount_percent", {
			precision: 6,
			scale: 2,
		}).default("0"),
		discountAmount: numeric("discount_amount", {
			precision: 18,
			scale: 6,
		}).default("0"),

		taxPercent: numeric("tax_percent", { precision: 6, scale: 2 }).default("0"),
		taxAmount: numeric("tax_amount", { precision: 18, scale: 6 }).default("0"),

		lineTotal: numeric("line_total", { precision: 18, scale: 6 }).notNull(),

		referenceLineId: text("reference_line_id"),

		lineNumber: integer("line_number").notNull(),

		...timestamps,
	},
	(t) => [index().on(t.documentId)],
);

export const documentSequences = pgTable(
	"document_sequence",
	{
		id: uuidPk("id"),
		organizationId: text("organization_id").notNull(),

		documentType: text("document_type", {
			enum: COMMERCIAL_DOCUMENT_TYPES,
		}).notNull(),
		series: text("series").default("001").notNull(),

		year: integer("year").notNull(),
		lastNumber: integer("last_number").default(0).notNull(),

		authorizationNumber: text("authorization_number"),
		authorizationStartDate: text("authorization_start_date"),
		authorizationEndDate: text("authorization_end_date"),

		isActive: boolean("is_active").default(true).notNull(),

		...timestamps,
	},
	(t) => [unique().on(t.organizationId, t.documentType, t.series, t.year)],
);

export const commercialDocumentsRelations = relations(
	commercialDocuments,
	({ one, many }) => ({
		customer: one(customers, {
			fields: [commercialDocuments.customerId],
			references: [customers.id],
		}),
		supplier: one(suppliers, {
			fields: [commercialDocuments.supplierId],
			references: [suppliers.id],
		}),
		lines: many(commercialDocumentLines),
	}),
);

export const commercialDocumentLinesRelations = relations(
	commercialDocumentLines,
	({ one }) => ({
		document: one(commercialDocuments, {
			fields: [commercialDocumentLines.documentId],
			references: [commercialDocuments.id],
		}),
		product: one(product, {
			fields: [commercialDocumentLines.productId],
			references: [product.id],
		}),
	}),
);
