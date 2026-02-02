import { z } from "zod";
import {
	discountAppliesTo,
	discountTypes,
	priceListTypes,
} from "@/db/schema/products";

export const createPriceList = z.object({
	code: z.string().min(1).max(50),
	name: z.string().min(1).max(100),
	type: z.enum(priceListTypes),
	currency: z.string().min(3).max(3).default("USD"),
	attributes: z.record(z.string(), z.any()).default({}),
});

export const updatePriceList = z.object({
	id: z.string(),
	code: z.string().min(1).max(50).optional(),
	name: z.string().min(1).max(100).optional(),
	type: z.enum(priceListTypes).optional(),
	currency: z.string().min(3).max(3).optional(),
	attributes: z.record(z.string(), z.any()).optional(),
});

export const createProductPrice = z.object({
	productId: z.string(),
	priceListId: z.string().optional(),
	customerId: z.string().optional(),
	uomCode: z.string().min(1),
	price: z.number().min(0),
	currency: z.string().min(3).max(3).default("USD"),
	minQty: z.number().positive().default(1),
	effectiveFrom: z.date().optional(),
	effectiveTo: z.date().optional(),
});

export const updateProductPrice = z.object({
	id: z.string(),
	priceListId: z.string().optional(),
	customerId: z.string().optional(),
	uomCode: z.string().min(1).optional(),
	price: z.number().min(0).optional(),
	currency: z.string().min(3).max(3).optional(),
	minQty: z.number().positive().optional(),
	effectiveFrom: z.date().optional(),
	effectiveTo: z.date().optional(),
	isActive: z.boolean().optional(),
});

export const getActivePrice = z.object({
	productId: z.string(),
	uomCode: z.string().min(1),
	qty: z.number().positive().default(1),
	priceListId: z.string().optional(),
	customerId: z.string().optional(),
	asOfDate: z.date().optional(),
});

export const discountConditionsSchema = z.object({
	minQty: z.number().positive().optional(),
	maxQty: z.number().positive().optional(),
	uomCodes: z.array(z.string()).optional(),
	minOrderTotal: z.number().positive().optional(),
	daysOfWeek: z.array(z.string()).optional(),
	tiers: z
		.array(
			z.object({
				minQty: z.number().positive(),
				maxQty: z.number().positive().optional(),
				discount: z.number(),
				type: z.enum(["percentage", "fixed"]),
			}),
		)
		.optional(),
});

export const createDiscountRule = z.object({
	code: z.string().min(1).max(50),
	name: z.string().min(1).max(100),
	type: z.enum(discountTypes),
	value: z.number().min(0).max(100, "Percentage discount cannot exceed 100%"),
	currency: z.string().min(3).max(3).default("USD"),
	appliesTo: z.enum(discountAppliesTo),
	appliesToId: z.string().optional(),
	conditions: discountConditionsSchema.optional().default({}),
	combinable: z.boolean().default(false),
	startAt: z.date().optional(),
	endAt: z.date().optional(),
	maxUses: z.number().int().positive().optional(),
});

export const updateDiscountRule = z.object({
	id: z.string(),
	code: z.string().min(1).max(50).optional(),
	name: z.string().min(1).max(100).optional(),
	type: z.enum(discountTypes).optional(),
	value: z
		.number()
		.min(0)
		.max(100, "Percentage discount cannot exceed 100%")
		.optional(),
	currency: z.string().min(3).max(3).optional(),
	appliesTo: z.enum(discountAppliesTo).optional(),
	appliesToId: z.string().optional(),
	conditions: discountConditionsSchema.optional(),
	combinable: z.boolean().optional(),
	startAt: z.date().optional(),
	endAt: z.date().optional(),
	maxUses: z.number().int().positive().optional(),
	isActive: z.boolean().optional(),
});

export const calculateDiscount = z.object({
	productId: z.string(),
	basePrice: z.number().positive(),
	qty: z.number().positive().default(1),
	priceListId: z.string().optional(),
	customerId: z.string().optional(),
	uomCode: z.string().min(1),
});

export const discountCalculationResult = z.object({
	originalPrice: z.number(),
	discountAmount: z.number(),
	finalPrice: z.number(),
	appliedRules: z.array(
		z.object({
			ruleId: z.string(),
			ruleName: z.string(),
			discountType: z.enum(discountTypes),
			discountValue: z.number(),
			discountAmount: z.number(),
		}),
	),
});

export const bulkCalculateDiscount = z.object({
	lines: z
		.array(
			z.object({
				productId: z.string(),
				basePrice: z.number().positive(),
				qty: z.number().positive().default(1),
				uomCode: z.string().min(1),
				priceListId: z.string().optional(),
				customerId: z.string().optional(),
			}),
		)
		.min(1),
});

export const previewDiscount = z.object({
	productId: z.string(),
	basePrice: z.number().positive(),
	qty: z.number().positive().default(1),
	uomCode: z.string().min(1),
	priceListId: z.string().optional(),
	customerId: z.string().optional(),
});

export const validateDiscount = z.object({
	code: z.string().min(1),
	productId: z.string(),
	basePrice: z.number().positive(),
	qty: z.number().positive().default(1),
	uomCode: z.string().min(1),
	priceListId: z.string().optional(),
	customerId: z.string().optional(),
});

export type CreatePriceListInput = z.infer<typeof createPriceList>;
export type UpdatePriceListInput = z.infer<typeof updatePriceList>;
export type CreateProductPriceInput = z.infer<typeof createProductPrice>;
export type UpdateProductPriceInput = z.infer<typeof updateProductPrice>;
export type GetActivePriceInput = z.infer<typeof getActivePrice>;
export type CreateDiscountRuleInput = z.infer<typeof createDiscountRule>;
export type UpdateDiscountRuleInput = z.infer<typeof updateDiscountRule>;
export type CalculateDiscountInput = z.infer<typeof calculateDiscount>;
export type DiscountCalculationResult = z.infer<
	typeof discountCalculationResult
>;
export type BulkCalculateDiscountInput = z.infer<typeof bulkCalculateDiscount>;
export type PreviewDiscountInput = z.infer<typeof previewDiscount>;
export type ValidateDiscountInput = z.infer<typeof validateDiscount>;
