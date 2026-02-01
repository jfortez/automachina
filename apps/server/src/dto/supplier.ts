import { z } from "zod";

export const createSupplier = z.object({
	code: z.string().min(1),
	name: z.string().min(1),
	image: z.string().optional(),
	contactInfo: z.record(z.string(), z.any()).optional(),
});

export const updateSupplier = z.object({
	id: z.string().uuid(),
	code: z.string().min(1).optional(),
	name: z.string().min(1).optional(),
	image: z.string().optional(),
	contactInfo: z.record(z.string(), z.any()).optional(),
});

export const createSupplierProduct = z.object({
	supplierId: z.string().uuid(),
	productId: z.string().uuid(),
	supplierSku: z.string().optional(),
	defaultUom: z.string().optional(),
	leadTimeDays: z.number().int().min(0).optional(),
	minOrderQty: z.string().optional(),
});

export const updateSupplierProduct = z.object({
	id: z.string().uuid(),
	supplierSku: z.string().optional(),
	defaultUom: z.string().optional(),
	leadTimeDays: z.number().int().min(0).optional(),
	minOrderQty: z.string().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplier>;
export type UpdateSupplierInput = z.infer<typeof updateSupplier>;
export type CreateSupplierProductInput = z.infer<typeof createSupplierProduct>;
export type UpdateSupplierProductInput = z.infer<typeof updateSupplierProduct>;
