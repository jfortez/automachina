import { z } from "zod";

const orderLineSchema = z.object({
	productId: z.string(),
	qtyOrdered: z.number().positive(),
	uomCode: z.string().min(1),
	pricePerUom: z.number().min(0).optional(),
	currency: z.string().default("USD"),
	notes: z.string().optional(),
});

export const createSalesOrderSchema = z.object({
	customerId: z.string(),
	warehouseId: z.string().optional(),
	lines: z.array(orderLineSchema).min(1),
	notes: z.string().optional(),
	referenceNumber: z.string().optional(),
});

export const updateSalesOrderSchema = z.object({
	id: z.string(),
	status: z.enum(["open", "processing", "fulfilled", "cancelled"]).optional(),
	warehouseId: z.string().optional(),
	lines: z
		.array(
			orderLineSchema.extend({
				id: z.string().optional(),
			}),
		)
		.optional(),
	notes: z.string().optional(),
});

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderSchema>;

export const listSalesOrdersSchema = z.object({
	status: z.enum(["open", "processing", "fulfilled", "cancelled"]).optional(),
	customerId: z.string().optional(),
	warehouseId: z.string().optional(),
	dateFrom: z.date().optional(),
	dateTo: z.date().optional(),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
});

export const listPurchaseOrdersSchema = z.object({
	status: z
		.enum(["open", "ordered", "partially_received", "received", "cancelled"])
		.optional(),
	supplierId: z.string().optional(),
	warehouseId: z.string().optional(),
	dateFrom: z.date().optional(),
	dateTo: z.date().optional(),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
});

export const getOrderByIdSchema = z.object({
	id: z.string(),
});

export const createPurchaseOrderSchema = z.object({
	supplierId: z.string(),
	warehouseId: z.string().optional(),
	lines: z.array(orderLineSchema).min(1),
	notes: z.string().optional(),
	referenceNumber: z.string().optional(),
	expectedDeliveryDate: z.date().optional(),
});

export const updatePurchaseOrderSchema = z.object({
	id: z.string(),
	status: z
		.enum(["open", "ordered", "partially_received", "received", "cancelled"])
		.optional(),
	warehouseId: z.string().optional(),
	lines: z
		.array(
			orderLineSchema.extend({
				id: z.string().optional(),
			}),
		)
		.optional(),
	notes: z.string().optional(),
	expectedDeliveryDate: z.date().optional(),
});

export const receivePurchaseOrderSchema = z.object({
	purchaseOrderId: z.string(),
	receiptLines: z.array(
		z.object({
			orderLineId: z.string(),
			qtyReceived: z.number().min(0),
			uomCode: z.string().min(1),
			costPerUom: z.number().min(0).optional(),
			currency: z.string().default("USD"),
			batchNumber: z.string().optional(),
			expirationDate: z.date().optional(),
		}),
	),
	notes: z.string().optional(),
});

export type CreatePurchaseOrderInput = z.infer<
	typeof createPurchaseOrderSchema
>;
export type UpdatePurchaseOrderInput = z.infer<
	typeof updatePurchaseOrderSchema
>;
export type ReceivePurchaseOrderInput = z.infer<
	typeof receivePurchaseOrderSchema
>;
export type ListSalesOrdersInput = z.infer<typeof listSalesOrdersSchema>;
export type ListPurchaseOrdersInput = z.infer<typeof listPurchaseOrdersSchema>;
export type GetOrderByIdInput = z.infer<typeof getOrderByIdSchema>;
