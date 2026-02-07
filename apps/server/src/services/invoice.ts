import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoice, invoiceItem } from "@/db/schema/invoice";
import {
	purchaseOrderLines,
	purchaseOrders,
	salesOrderLines,
	salesOrders,
} from "@/db/schema/orders";
import { organizationSettings } from "@/db/schema/organization";
import { invoiceSequence } from "@/db/schema/tax";
import type {
	DeleteInvoiceInput,
	GenerateInvoiceFromOrderInput,
	GetInvoiceByIdInput,
	ListInvoicesInput,
	MarkInvoiceAsPaidInput,
	UpdateInvoiceInput,
} from "@/dto/invoice";
import type { Transaction } from "@/types";
import { convertUomToBase } from "./uom";

// Types for tax and discount calculations
interface OrderItem {
	orderLineId: string;
	productId: string;
	qty: number;
	uomCode: string;
	unitPrice: number;
	currency: string;
	lineTotal: number;
}

interface OrderItemForCalculation {
	productId: string;
	qty: number;
	unitPrice: number;
	lineTotal: number;
}

interface AppliedTax {
	taxRuleId: string;
	taxName: string;
	taxPercent: number;
	taxableAmount: number;
	taxAmount: number;
}

interface AppliedDiscount {
	discountRuleId?: string;
	discountName: string;
	discountType: "percentage" | "fixed";
	discountValue: number;
	discountAmount: number;
}

interface InvoiceTotals {
	subtotal: number;
	discountAmount: number;
	taxAmount: number;
	totalAmount: number;
	appliedTaxes: AppliedTax[];
	appliedDiscounts: AppliedDiscount[];
}

// Service for generating next invoice number
async function generateInvoiceNumber(
	organizationId: string,
	sequenceType: "sales" | "purchase",
): Promise<string> {
	const currentYear = new Date().getFullYear();
	const currentMonth = new Date().getMonth() + 1;

	// Get or create sequence entry
	let [sequence] = await db
		.select()
		.from(invoiceSequence)
		.where(
			sql`${invoiceSequence.organizationId} = ${organizationId} AND
          ${invoiceSequence.year} = ${currentYear} AND
          ${invoiceSequence.month} = ${currentMonth} AND
          ${invoiceSequence.sequenceType} = ${sequenceType}`,
		)
		.limit(1);

	if (!sequence) {
		// Create new sequence entry
		[sequence] = await db
			.insert(invoiceSequence)
			.values({
				organizationId,
				year: currentYear,
				month: currentMonth,
				sequenceType,
				lastNumber: 0,
			})
			.returning();
	}

	// Increment sequence
	const nextNumber = sequence.lastNumber + 1;
	await db
		.update(invoiceSequence)
		.set({ lastNumber: nextNumber })
		.where(eq(invoiceSequence.id, sequence.id));

	// Get organization settings for prefix
	const [orgSettings] = await db
		.select()
		.from(organizationSettings)
		.where(eq(organizationSettings.organizationId, organizationId))
		.limit(1);

	const prefix = orgSettings?.invoiceSequencePrefix || "INV";

	//TODO: fix later
	// Use timestamp-based unique code for tests or when no org settings
	if (!orgSettings) {
		const timestamp = Date.now();
		const randomSuffix = Math.random()
			.toString(36)
			.substring(2, 6)
			.toUpperCase();
		return `${prefix}-${currentYear}${currentMonth.toString().padStart(2, "0")}-${timestamp}-${randomSuffix}`;
	}

	const paddedNumber = nextNumber.toString().padStart(4, "0");
	return `${prefix}-${currentYear}${currentMonth.toString().padStart(2, "0")}-${paddedNumber}`;
}

// Calculate applicable taxes for an order
async function calculateApplicableTaxes(
	tx: Transaction,
	organizationId: string,
	orderItems: OrderItemForCalculation[],
): Promise<AppliedTax[]> {
	// Get organization tax settings
	const [orgSettings] = await tx
		.select({
			taxRegion: organizationSettings.taxRegion,
			defaultTaxPercent: organizationSettings.defaultTaxPercent,
		})
		.from(organizationSettings)
		.where(eq(organizationSettings.organizationId, organizationId))
		.limit(1);

	const applicableTaxes: AppliedTax[] = [];

	// For each line item, apply default tax if no specific rules
	for (const item of orderItems) {
		const taxableAmount = item.lineTotal;
		const taxPercent = orgSettings?.defaultTaxPercent
			? Number(orgSettings.defaultTaxPercent)
			: 0;

		if (taxPercent > 0) {
			const taxAmount = (taxableAmount * taxPercent) / 100;
			applicableTaxes.push({
				taxRuleId: "default",
				taxName: "IVA",
				taxPercent,
				taxableAmount,
				taxAmount,
			});
		}
	}

	return applicableTaxes;
}

// Apply automatic discounts based on organization settings
async function calculateAutomaticDiscounts(
	tx: Transaction,
	organizationId: string,
	_orderItems: OrderItemForCalculation[],
): Promise<AppliedDiscount[]> {
	// Get organization discount settings
	const [orgSettings] = await tx
		.select({
			autoApplyDiscounts: organizationSettings.autoApplyDiscounts,
			maxDiscountPercent: organizationSettings.maxDiscountPercent,
		})
		.from(organizationSettings)
		.where(eq(organizationSettings.organizationId, organizationId))
		.limit(1);

	if (!orgSettings?.autoApplyDiscounts) {
		return [];
	}

	// For now, return empty discounts - this would be extended with business rules
	// for volume discounts, customer-specific discounts, etc.
	return [];
}

// Calculate automatic invoice totals including taxes and discounts
async function calculateInvoiceTotals(
	tx: Transaction,
	organizationId: string,
	items: OrderItemForCalculation[],
	overrideDiscountPercent?: number,
): Promise<InvoiceTotals> {
	const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
	let totalDiscount = 0;
	let totalTax = 0;

	// Calculate automatic discounts
	const appliedDiscounts = await calculateAutomaticDiscounts(
		tx,
		organizationId,
		items,
	);

	// Add header-level discount if specified
	if (overrideDiscountPercent) {
		const headerDiscount = (subtotal * overrideDiscountPercent) / 100;
		appliedDiscounts.push({
			discountName: "Manual Header Discount",
			discountType: "percentage",
			discountValue: overrideDiscountPercent,
			discountAmount: headerDiscount,
		});
		totalDiscount += headerDiscount;
	}

	// Calculate subtotal after discounts
	const discountedSubtotal = subtotal - totalDiscount;

	// Calculate applicable taxes
	const appliedTaxes = await calculateApplicableTaxes(
		tx,
		organizationId,
		items,
	);

	// Apply taxes to the discounted subtotal
	for (const tax of appliedTaxes) {
		tax.taxableAmount = discountedSubtotal;
		tax.taxAmount = (discountedSubtotal * tax.taxPercent) / 100;
		totalTax += tax.taxAmount;
	}

	return {
		subtotal,
		discountAmount: totalDiscount,
		taxAmount: totalTax,
		totalAmount: discountedSubtotal + totalTax,
		appliedTaxes,
		appliedDiscounts,
	};
}

// Helper to get base UOM
async function getBaseUom(tx: Transaction, productId: string): Promise<string> {
	const result = await tx.execute(
		sql`SELECT base_uom FROM product WHERE id = ${productId}`,
	);
	const product = result.rows[0] as { base_uom: string } | undefined;

	if (!product?.base_uom) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
	}

	return product.base_uom;
}

// Generate complete invoice from fulfilled order
export const generateInvoiceFromOrder = async (
	input: GenerateInvoiceFromOrderInput,
): Promise<{
	invoice: typeof invoice.$inferSelect;
	items: (typeof invoiceItem.$inferSelect)[];
}> => {
	return await db.transaction(async (tx) => {
		if (input.orderType === "sales") {
			// Handle sales orders
			const [salesOrder] = await tx
				.select()
				.from(salesOrders)
				.where(eq(salesOrders.id, input.orderId));

			if (!salesOrder) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Sales order not found",
				});
			}

			if (salesOrder.status !== "fulfilled") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Order must be fulfilled before invoicing. Current status: ${salesOrder.status}`,
				});
			}

			if (salesOrder.invoiceId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Order already has an invoice",
				});
			}

			const invoiceNumber = await generateInvoiceNumber(
				salesOrder.organizationId,
				"sales",
			);

			// Get sales order lines
			const orderLines = await tx
				.select()
				.from(salesOrderLines)
				.where(eq(salesOrderLines.salesOrderId, input.orderId));

			// Build invoice items
			const invoiceItemsInput: OrderItem[] = [];
			for (const line of orderLines) {
				await convertUomToBase(
					tx,
					line.productId,
					Number(line.qtyOrdered),
					line.uomCode,
					await getBaseUom(tx, line.productId),
				);

				invoiceItemsInput.push({
					orderLineId: line.id,
					productId: line.productId,
					qty: Number(line.qtyOrdered),
					uomCode: line.uomCode,
					unitPrice: Number(line.pricePerUom || 0),
					currency: line.currency || "USD",
					lineTotal: Number(line.pricePerUom || 0) * Number(line.qtyOrdered),
				});
			}

			const itemsForCalculation = invoiceItemsInput.map((item) => ({
				productId: item.productId,
				qty: item.qty,
				unitPrice: item.unitPrice,
				lineTotal: item.lineTotal,
			}));

			const totals = await calculateInvoiceTotals(
				tx,
				salesOrder.organizationId,
				itemsForCalculation,
				input.applyDiscounts ? undefined : 0,
			);

			// Create sales invoice
			const [createdInvoice] = await tx
				.insert(invoice)
				.values({
					organizationId: salesOrder.organizationId,
					orderId: input.orderId,
					orderType: "sales",
					invoiceNumber,
					invoiceDate: input.invoiceDate || new Date(),
					dueDate: input.dueDate,
					customerId: salesOrder.customerId,
					status: "issued",
					subtotal: totals.subtotal.toString(),
					totalDiscount: totals.discountAmount.toString(),
					totalTax: totals.taxAmount.toString(),
					totalAmount: totals.totalAmount.toString(),
					currency: "USD",
					appliedTaxRules: JSON.stringify(totals.appliedTaxes),
					appliedDiscounts: JSON.stringify(totals.appliedDiscounts),
					notes: input.notes,
					issuedAt: new Date(),
				})
				.returning();

			// Create invoice items
			const createdItems = [];
			for (const [index, item] of invoiceItemsInput.entries()) {
				const [invoiceItemData] = await tx
					.insert(invoiceItem)
					.values({
						invoiceId: createdInvoice.id,
						orderLineId: item.orderLineId,
						productId: item.productId,
						qty: item.qty.toString(),
						uomCode: item.uomCode,
						unitPrice: item.unitPrice.toString(),
						currency: item.currency,
						lineTotal: item.lineTotal.toString(),
						discountAmount: "0",
						taxAmount: "0",
						lineNumber: index + 1,
						notes: input.notes,
					})
					.returning();

				createdItems.push(invoiceItemData);
			}

			// Update sales order with invoice reference
			await tx
				.update(salesOrders)
				.set({ invoiceId: createdInvoice.id })
				.where(eq(salesOrders.id, input.orderId));

			return {
				invoice: createdInvoice,
				items: createdItems as (typeof invoiceItem.$inferSelect)[],
			};
		}
		// Handle purchase orders
		const [purchaseOrder] = await tx
			.select()
			.from(purchaseOrders)
			.where(eq(purchaseOrders.id, input.orderId));

		if (!purchaseOrder) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Purchase order not found",
			});
		}

		if (purchaseOrder.status !== "received") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Order must be received before invoicing. Current status: ${purchaseOrder.status}`,
			});
		}

		if (purchaseOrder.invoiceId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Order already has an invoice",
			});
		}

		const invoiceNumber = await generateInvoiceNumber(
			purchaseOrder.organizationId,
			"purchase",
		);

		// Get purchase order lines
		const orderLines = await tx
			.select()
			.from(purchaseOrderLines)
			.where(eq(purchaseOrderLines.purchaseOrderId, input.orderId));

		// Build invoice items
		const invoiceItemsInput: OrderItem[] = [];
		for (const line of orderLines) {
			await convertUomToBase(
				tx,
				line.productId,
				Number(line.qtyOrdered),
				line.uomCode,
				await getBaseUom(tx, line.productId),
			);

			invoiceItemsInput.push({
				orderLineId: line.id,
				productId: line.productId,
				qty: Number(line.qtyOrdered),
				uomCode: line.uomCode,
				unitPrice: Number(line.pricePerUom || 0),
				currency: line.currency || "USD",
				lineTotal: Number(line.pricePerUom || 0) * Number(line.qtyOrdered),
			});
		}

		const itemsForCalculation = invoiceItemsInput.map((item) => ({
			productId: item.productId,
			qty: item.qty,
			unitPrice: item.unitPrice,
			lineTotal: item.lineTotal,
		}));

		const totals = await calculateInvoiceTotals(
			tx,
			purchaseOrder.organizationId,
			itemsForCalculation,
			input.applyDiscounts ? undefined : 0,
		);

		// Create purchase invoice
		const [createdInvoice] = await tx
			.insert(invoice)
			.values({
				organizationId: purchaseOrder.organizationId,
				orderId: input.orderId,
				orderType: "purchase",
				invoiceNumber,
				invoiceDate: input.invoiceDate || new Date(),
				dueDate: input.dueDate,
				supplierId: purchaseOrder.supplierId,
				status: "issued",
				subtotal: totals.subtotal.toString(),
				totalDiscount: totals.discountAmount.toString(),
				totalTax: totals.taxAmount.toString(),
				totalAmount: totals.totalAmount.toString(),
				currency: "USD",
				appliedTaxRules: JSON.stringify(totals.appliedTaxes),
				appliedDiscounts: JSON.stringify(totals.appliedDiscounts),
				notes: input.notes,
				issuedAt: new Date(),
			})
			.returning();

		// Create invoice items
		const createdItems = [];
		for (const [index, item] of invoiceItemsInput.entries()) {
			const [invoiceItemData] = await tx
				.insert(invoiceItem)
				.values({
					invoiceId: createdInvoice.id,
					orderLineId: item.orderLineId,
					productId: item.productId,
					qty: item.qty.toString(),
					uomCode: item.uomCode,
					unitPrice: item.unitPrice.toString(),
					currency: item.currency,
					lineTotal: item.lineTotal.toString(),
					discountAmount: "0",
					taxAmount: "0",
					lineNumber: index + 1,
					notes: input.notes,
				})
				.returning();

			createdItems.push(invoiceItemData);
		}

		// Update purchase order with invoice reference
		await tx
			.update(purchaseOrders)
			.set({ invoiceId: createdInvoice.id })
			.where(eq(purchaseOrders.id, input.orderId));

		return {
			invoice: createdInvoice,
			items: createdItems as (typeof invoiceItem.$inferSelect)[],
		};
	});
};

// Get invoice by ID with items
export const getInvoiceById = async (
	input: GetInvoiceByIdInput,
): Promise<{
	invoice: typeof invoice.$inferSelect & {
		invoiceItems: (typeof invoiceItem.$inferSelect)[];
	};
	items: (typeof invoiceItem.$inferSelect)[];
}> => {
	try {
		// Get the invoice
		const [currentInvoice] = await db
			.select()
			.from(invoice)
			.where(eq(invoice.id, input.id))
			.limit(1);

		if (!currentInvoice) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Invoice not found",
			});
		}

		// Get invoice items
		const items = await db
			.select()
			.from(invoiceItem)
			.where(eq(invoiceItem.invoiceId, input.id))
			.orderBy(invoiceItem.lineNumber);

		return {
			invoice: { ...currentInvoice, invoiceItems: items },
			items,
		};
	} catch (error) {
		// If it's already a TRPCError, rethrow it
		if (error instanceof TRPCError) {
			throw error;
		}

		// For any other errors, wrap in NOT_FOUND
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Invoice not found",
		});
	}
};

// List invoices with pagination and filters
export const getInvoices = async (
	input: ListInvoicesInput,
	organizationId: string,
): Promise<{
	invoices: (typeof invoice.$inferSelect)[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		hasMore: boolean;
	};
}> => {
	const {
		status,
		orderType,
		customerId,
		supplierId,
		dateFrom,
		dateTo,
		page,
		limit,
	} = input;
	const offset = (page - 1) * limit;

	// Build where conditions
	let whereConditions = eq(invoice.organizationId, organizationId);

	if (status) {
		whereConditions = sql`${whereConditions} AND ${invoice.status} = ${status}`;
	}

	if (orderType) {
		whereConditions = sql`${whereConditions} AND ${invoice.orderType} = ${orderType}`;
	}

	if (customerId && !supplierId) {
		whereConditions = sql`${whereConditions} AND ${invoice.customerId} = ${customerId}`;
	}

	if (supplierId && !customerId) {
		whereConditions = sql`${whereConditions} AND ${invoice.supplierId} = ${supplierId}`;
	}

	if (dateFrom || dateTo) {
		let dateFilter = sql`TRUE`;
		if (dateFrom) {
			dateFilter = sql`${dateFilter} AND ${invoice.invoiceDate} >= ${dateFrom}`;
		}
		if (dateTo) {
			dateFilter = sql`${dateFilter} AND ${invoice.invoiceDate} <= ${dateTo}`;
		}
		whereConditions = sql`${whereConditions} AND ${dateFilter}`;
	}

	// Get total count
	const [totalResult] = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(invoice)
		.where(whereConditions);

	const total = Number(totalResult.count);

	// Get paginated results ordered by newest first
	const invoices = await db
		.select()
		.from(invoice)
		.where(whereConditions)
		.orderBy(sql`${invoice.invoiceDate} DESC`)
		.limit(limit)
		.offset(offset);

	return {
		invoices,
		pagination: {
			page,
			limit,
			total,
			hasMore: page * limit < total,
		},
	};
};

// Update invoice (limited operations for status changes)
export const updateInvoice = async (
	input: UpdateInvoiceInput,
): Promise<typeof invoice.$inferSelect> => {
	return await db.transaction(async (tx) => {
		// Check if invoice exists
		const [currentInvoice] = await tx
			.select()
			.from(invoice)
			.where(eq(invoice.id, input.id))
			.limit(1);

		if (!currentInvoice) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Invoice not found",
			});
		}

		const updatedFields: any = {};

		// Handle status changes with strict business rules
		if (input.status) {
			const validTransitions: Record<string, string[]> = {
				draft: ["issued", "cancelled"],
				issued: ["paid", "cancelled"],
				paid: [], // Paid invoices cannot be changed
				cancelled: [], // Cancelled invoices cannot be changed
			};

			const allowedStatuses = validTransitions[currentInvoice.status] || [];
			if (!allowedStatuses.includes(input.status)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Invalid status transition from "${currentInvoice.status}" to "${input.status}". Allowed transitions: ${allowedStatuses.join(", ")}`,
				});
			}

			updatedFields.status = input.status;

			// Set timestamps based on status change
			if (input.status === "issued" && currentInvoice.status === "draft") {
				updatedFields.issuedAt = new Date();
			} else if (
				input.status === "paid" &&
				currentInvoice.status === "issued"
			) {
				updatedFields.paidAt = new Date();
			} else if (input.status === "cancelled") {
				updatedFields.cancelledAt = new Date();
			}
		}

		// Handle other non-status fields (can be updated regardless of status)
		if (input.invoiceDate !== undefined) {
			updatedFields.invoiceDate = input.invoiceDate;
		}

		if (input.dueDate !== undefined) {
			updatedFields.dueDate = input.dueDate;
		}

		if (input.notes !== undefined) {
			updatedFields.notes = input.notes;
		}

		if (input.terms !== undefined) {
			updatedFields.terms = input.terms;
		}

		if (input.referenceNumber !== undefined) {
			updatedFields.referenceNumber = input.referenceNumber;
		}

		// Business rule: Paid or cancelled invoices can only have notes/territory/reference updated
		const restrictedStatuses = ["paid", "cancelled"];
		if (
			restrictedStatuses.includes(currentInvoice.status) &&
			input.status === undefined
		) {
			// Only allow updating notes, terms, and reference for paid/cancelled invoices
			const allowedFields = ["notes", "terms", "referenceNumber"];
			const requestedFields = Object.keys(updatedFields);
			const hasDisallowedFields = requestedFields.some(
				(field) => !allowedFields.includes(field),
			);

			if (hasDisallowedFields) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Invoices with status "${currentInvoice.status}" can only have notes, terms, and reference number updated.`,
				});
			}
		}

		// Only update if there are fields to update
		if (Object.keys(updatedFields).length === 0) {
			// No changes requested, return current invoice
			return currentInvoice;
		}

		// Update the invoice
		const [updated] = await tx
			.update(invoice)
			.set(updatedFields)
			.where(eq(invoice.id, input.id))
			.returning();

		return updated;
	});
};

// Delete invoice (soft delete)
export const deleteInvoice = async (
	input: DeleteInvoiceInput,
): Promise<{ success: boolean }> => {
	return await db.transaction(async (tx) => {
		// Check if invoice exists
		const [existingInvoice] = await tx
			.select()
			.from(invoice)
			.where(eq(invoice.id, input.id))
			.limit(1);

		if (!existingInvoice) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Invoice not found",
			});
		}

		// Business rule: Only draft invoices can be deleted
		if (existingInvoice.status !== "draft") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Only draft invoices can be deleted",
			});
		}

		// Soft delete the invoice
		await tx
			.update(invoice)
			.set({
				status: "cancelled",
				cancelledAt: new Date(),
			})
			.where(eq(invoice.id, input.id));

		return { success: true };
	});
};

// Mark invoice as paid
export const markInvoiceAsPaid = async (
	input: MarkInvoiceAsPaidInput,
): Promise<typeof invoice.$inferSelect> => {
	return await db.transaction(async (tx) => {
		// Get current invoice
		const [current] = await tx
			.select()
			.from(invoice)
			.where(eq(invoice.id, input.id))
			.limit(1);

		if (!current) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Invoice not found",
			});
		}

		// Business rule: Only issued invoices can be marked as paid
		if (current.status !== "issued") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Only issued invoices can be marked as paid. Current status: ${current.status}`,
			});
		}

		// Update status to paid
		const [updated] = await tx
			.update(invoice)
			.set({
				status: "paid",
				paidAt: new Date(),
			})
			.where(eq(invoice.id, input.id))
			.returning();

		return updated;
	});
};
