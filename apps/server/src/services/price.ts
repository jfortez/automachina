import { TRPCError } from "@trpc/server";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import {
	type discountAppliesTo,
	discountRule,
	type discountTypes,
	priceList,
	priceListTypes,
	product,
	productPrice,
} from "@/db/schema/products";
import type {
	CalculateDiscountInput,
	CreateDiscountRuleInput,
	CreatePriceListInput,
	CreateProductPriceInput,
	GetActivePriceInput,
	UpdateDiscountRuleInput,
	UpdatePriceListInput,
	UpdateProductPriceInput,
} from "@/dto/price";

/**
 * Retrieves all price lists for a specific organization
 * @param organizationId - The organization ID to filter by
 * @returns Array of price lists
 */
export const getAllPriceLists = async (organizationId: string) => {
	return await db.query.priceList.findMany({
		where: eq(priceList.organizationId, organizationId),
		orderBy: (priceList, { asc }) => [asc(priceList.name)],
	});
};

/**
 * Retrieves a price list by its ID
 * @param id - The price list ID
 * @returns The price list or undefined if not found
 */
export const getPriceListById = async (id: string) => {
	return await db.query.priceList.findFirst({
		where: eq(priceList.id, id),
	});
};

/**
 * Retrieves a price list by its code within an organization
 * @param code - The price list code
 * @param organizationId - The organization ID
 * @returns The price list or undefined if not found
 */
export const getPriceListByCode = async (
	code: string,
	organizationId: string,
) => {
	return await db.query.priceList.findFirst({
		where: and(
			eq(priceList.code, code),
			eq(priceList.organizationId, organizationId),
		),
	});
};

/**
 * Creates a new price list for an organization
 * @param data - The price list data
 * @param organizationId - The organization ID
 * @returns The created price list
 * @throws TRPCError if a price list with the same code already exists
 */
export const createPriceList = async (
	data: CreatePriceListInput,
	organizationId: string,
) => {
	const existing = await getPriceListByCode(data.code, organizationId);
	if (existing) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Price list with code "${data.code}" already exists`,
		});
	}

	const [created] = await db
		.insert(priceList)
		.values({
			organizationId,
			code: data.code,
			name: data.name,
			type: data.type,
			currency: data.currency,
			attributes: data.attributes,
		})
		.returning();

	return created;
};

/**
 * Updates an existing price list
 * @param data - The update data including the price list ID
 * @returns The updated price list
 * @throws TRPCError if the price list is not found
 */
export const updatePriceList = async (data: UpdatePriceListInput) => {
	const existing = await getPriceListById(data.id);
	if (!existing) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Price list not found",
		});
	}

	const { id, ...updateData } = data;
	const [updated] = await db
		.update(priceList)
		.set(updateData)
		.where(eq(priceList.id, id))
		.returning();

	return updated;
};

/**
 * Deletes a price list by ID
 * @param id - The price list ID
 * @throws TRPCError if the price list is not found or has associated prices
 */
export const deletePriceList = async (id: string) => {
	const existing = await getPriceListById(id);
	if (!existing) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Price list not found",
		});
	}

	const associatedPrices = await db.query.productPrice.findMany({
		where: eq(productPrice.priceListId, id),
		limit: 1,
	});

	if (associatedPrices.length > 0) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Cannot delete price list with associated prices",
		});
	}

	await db.delete(priceList).where(eq(priceList.id, id));
};

/**
 * Retrieves all prices for a specific product
 * @param productId - The product ID
 * @returns Array of product prices with price list and customer details
 */
export const getPricesByProduct = async (productId: string) => {
	return await db.query.productPrice.findMany({
		where: eq(productPrice.productId, productId),
		with: {
			priceList: true,
			customer: true,
		},
	});
};

/**
 * Retrieves all prices within a specific price list
 * @param priceListId - The price list ID
 * @returns Array of product prices with product details
 */
export const getPricesByPriceList = async (priceListId: string) => {
	return await db.query.productPrice.findMany({
		where: eq(productPrice.priceListId, priceListId),
		with: {
			product: true,
		},
	});
};

/**
 * Finds the active price for a product under specific conditions
 * Considers effective dates, minimum quantity, and price list hierarchy
 * @param input - The search criteria
 * @returns The applicable product price or undefined
 */
export const getActivePrice = async (input: GetActivePriceInput) => {
	const { productId, uomCode, qty, priceListId, customerId, asOfDate } = input;
	const checkDate = asOfDate || new Date();

	const prices = await db.query.productPrice.findMany({
		where: and(
			eq(productPrice.productId, productId),
			eq(productPrice.uomCode, uomCode),
			eq(productPrice.isActive, true),
			lte(productPrice.minQty, qty.toString()),
			or(
				isNull(productPrice.effectiveFrom),
				lte(productPrice.effectiveFrom, checkDate),
			),
			or(
				isNull(productPrice.effectiveTo),
				gte(productPrice.effectiveTo, checkDate),
			),
			or(
				isNull(productPrice.priceListId),
				priceListId ? eq(productPrice.priceListId, priceListId) : undefined,
			),
			or(
				isNull(productPrice.customerId),
				customerId ? eq(productPrice.customerId, customerId) : undefined,
			),
		),
		with: {
			priceList: true,
		},
		orderBy: (productPrice, { desc }) => [
			desc(productPrice.minQty),
			desc(productPrice.customerId),
			desc(productPrice.priceListId),
		],
	});

	return prices[0];
};

/**
 * Creates a new product price
 * @param data - The price data
 * @param _organizationId - The organization ID
 * @returns The created product price
 */
export const createProductPrice = async (
	data: CreateProductPriceInput,
	_organizationId: string,
) => {
	const [created] = await db
		.insert(productPrice)
		.values({
			productId: data.productId,
			priceListId: data.priceListId,
			customerId: data.customerId,
			uomCode: data.uomCode,
			price: data.price.toString(),
			currency: data.currency,
			minQty: data.minQty.toString(),
			effectiveFrom: data.effectiveFrom,
			effectiveTo: data.effectiveTo,
			isActive: true,
		})
		.returning();

	return created;
};

/**
 * Updates an existing product price
 * @param data - The update data including the price ID
 * @returns The updated product price
 * @throws TRPCError if the price is not found
 */
export const updateProductPrice = async (data: UpdateProductPriceInput) => {
	const existing = await db.query.productPrice.findFirst({
		where: eq(productPrice.id, data.id),
	});

	if (!existing) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Product price not found",
		});
	}

	const { id, ...updateData } = data;
	const updateValues: {
		price?: string;
		minQty?: string;
		priceListId?: string;
		customerId?: string;
		uomCode?: string;
		currency?: string;
		effectiveFrom?: Date;
		effectiveTo?: Date;
		isActive?: boolean;
	} = {};

	if (updateData.price !== undefined) {
		updateValues.price = updateData.price.toString();
	}
	if (updateData.minQty !== undefined) {
		updateValues.minQty = updateData.minQty.toString();
	}
	if (updateData.priceListId !== undefined) {
		updateValues.priceListId = updateData.priceListId;
	}
	if (updateData.customerId !== undefined) {
		updateValues.customerId = updateData.customerId;
	}
	if (updateData.uomCode !== undefined) {
		updateValues.uomCode = updateData.uomCode;
	}
	if (updateData.currency !== undefined) {
		updateValues.currency = updateData.currency;
	}
	if (updateData.effectiveFrom !== undefined) {
		updateValues.effectiveFrom = updateData.effectiveFrom;
	}
	if (updateData.effectiveTo !== undefined) {
		updateValues.effectiveTo = updateData.effectiveTo;
	}
	if (updateData.isActive !== undefined) {
		updateValues.isActive = updateData.isActive;
	}

	const [updated] = await db
		.update(productPrice)
		.set(updateValues)
		.where(eq(productPrice.id, id))
		.returning();

	return updated;
};

/**
 * Deletes a product price by ID
 * @param id - The product price ID
 * @throws TRPCError if the price is not found
 */
export const deleteProductPrice = async (id: string) => {
	const existing = await db.query.productPrice.findFirst({
		where: eq(productPrice.id, id),
	});

	if (!existing) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Product price not found",
		});
	}

	await db.delete(productPrice).where(eq(productPrice.id, id));
};

/**
 * Retrieves all discount rules for an organization
 * @param organizationId - The organization ID
 * @returns Array of discount rules
 */
export const getAllDiscountRules = async (organizationId: string) => {
	return await db.query.discountRule.findMany({
		where: eq(discountRule.organizationId, organizationId),
		orderBy: (discountRule, { asc }) => [asc(discountRule.name)],
	});
};

export const getDiscountRuleById = async (
	id: string,
	organizationId: string,
) => {
	return await db.query.discountRule.findFirst({
		where: and(
			eq(discountRule.id, id),
			eq(discountRule.organizationId, organizationId),
		),
	});
};

/**
 * Creates a new discount rule
 * @param data - The discount rule data
 * @param organizationId - The organization ID
 * @returns The created discount rule
 */
export const createDiscountRule = async (
	data: CreateDiscountRuleInput,
	organizationId: string,
) => {
	const [created] = await db
		.insert(discountRule)
		.values({
			organizationId,
			code: data.code,
			name: data.name,
			type: data.type,
			value: data.value.toString(),
			currency: data.currency,
			appliesTo: data.appliesTo,
			appliesToId: data.appliesToId,
			conditions: data.conditions,
			combinable: data.combinable,
			startAt: data.startAt,
			endAt: data.endAt,
			isActive: true,
		})
		.returning();

	return created;
};

/**
 * Updates an existing discount rule
 * @param data - The update data including the rule ID
 * @returns The updated discount rule
 * @throws TRPCError if the rule is not found
 */
export const updateDiscountRule = async (
	data: UpdateDiscountRuleInput,
	organizationId: string,
) => {
	const existing = await getDiscountRuleById(data.id, organizationId);
	if (!existing) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Discount rule not found",
		});
	}

	const { id, ...updateData } = data;
	const updateValues: {
		code?: string;
		name?: string;
		type?: (typeof discountTypes)[number];
		value?: string;
		currency?: string;
		appliesTo?: (typeof discountAppliesTo)[number];
		appliesToId?: string;
		conditions?: Record<string, unknown>;
		combinable?: boolean;
		startAt?: Date;
		endAt?: Date;
		isActive?: boolean;
	} = {};

	if (updateData.code !== undefined) {
		updateValues.code = updateData.code;
	}
	if (updateData.name !== undefined) {
		updateValues.name = updateData.name;
	}
	if (updateData.type !== undefined) {
		updateValues.type = updateData.type;
	}
	if (updateData.value !== undefined) {
		updateValues.value = updateData.value.toString();
	}
	if (updateData.currency !== undefined) {
		updateValues.currency = updateData.currency;
	}
	if (updateData.appliesTo !== undefined) {
		updateValues.appliesTo = updateData.appliesTo;
	}
	if (updateData.appliesToId !== undefined) {
		updateValues.appliesToId = updateData.appliesToId;
	}
	if (updateData.conditions !== undefined) {
		updateValues.conditions = updateData.conditions;
	}
	if (updateData.combinable !== undefined) {
		updateValues.combinable = updateData.combinable;
	}
	if (updateData.startAt !== undefined) {
		updateValues.startAt = updateData.startAt;
	}
	if (updateData.endAt !== undefined) {
		updateValues.endAt = updateData.endAt;
	}
	if (updateData.isActive !== undefined) {
		updateValues.isActive = updateData.isActive;
	}

	const [updated] = await db
		.update(discountRule)
		.set(updateValues)
		.where(eq(discountRule.id, id))
		.returning();

	return updated;
};

/**
 * Deletes a discount rule by ID
 * @param id - The discount rule ID
 * @throws TRPCError if the rule is not found
 */
export const deleteDiscountRule = async (
	id: string,
	organizationId: string,
) => {
	const existing = await getDiscountRuleById(id, organizationId);
	if (!existing) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Discount rule not found",
		});
	}

	await db.delete(discountRule).where(eq(discountRule.id, id));
};

/**
 * Calculates applicable discounts for a purchase
 * Evaluates all active discount rules and applies them based on conditions
 * @param input - The calculation input parameters
 * @returns Object containing original price, discount amount, final price, and applied rules
 */
export const calculateDiscount = async (input: CalculateDiscountInput) => {
	const { productId, basePrice, qty, priceListId, customerId, uomCode } = input;
	const now = new Date();

	const productData = await db.query.product.findFirst({
		where: eq(product.id, productId),
		columns: {
			id: true,
			categoryId: true,
		},
	});

	if (!productData) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Product not found",
		});
	}

	const allRules = await db.query.discountRule.findMany({
		where: and(
			eq(discountRule.isActive, true),
			or(isNull(discountRule.startAt), lte(discountRule.startAt, now)),
			or(isNull(discountRule.endAt), gte(discountRule.endAt, now)),
		),
	});

	const applicableRules = allRules.filter((rule) => {
		switch (rule.appliesTo) {
			case "global":
				return true;
			case "product":
				return rule.appliesToId === productId;
			case "category":
				return rule.appliesToId === productData.categoryId;
			case "price_list":
				return priceListId ? rule.appliesToId === priceListId : false;
			case "customer":
				return customerId ? rule.appliesToId === customerId : false;
			default:
				return false;
		}
	});

	let totalDiscount = 0;
	const appliedRules: Array<{
		ruleId: string;
		ruleName: string;
		discountType: string;
		discountValue: number;
		discountAmount: number;
	}> = [];

	const combinableRules = applicableRules.filter((r) => r.combinable);
	const nonCombinableRules = applicableRules.filter((r) => !r.combinable);

	if (nonCombinableRules.length > 0) {
		const bestRule = nonCombinableRules.reduce((best, current) => {
			const bestDiscount =
				best.type === "percentage"
					? basePrice * (Number(best.value) / 100)
					: Number(best.value);
			const currentDiscount =
				current.type === "percentage"
					? basePrice * (Number(current.value) / 100)
					: Number(current.value);
			return currentDiscount > bestDiscount ? current : best;
		});

		const discountAmount =
			bestRule.type === "percentage"
				? basePrice * (Number(bestRule.value) / 100)
				: Number(bestRule.value);

		totalDiscount += discountAmount;
		appliedRules.push({
			ruleId: bestRule.id,
			ruleName: bestRule.name,
			discountType: bestRule.type,
			discountValue: Number(bestRule.value),
			discountAmount,
		});
	}

	for (const rule of combinableRules) {
		const discountAmount =
			rule.type === "percentage"
				? basePrice * (Number(rule.value) / 100)
				: Number(rule.value);

		totalDiscount += discountAmount;
		appliedRules.push({
			ruleId: rule.id,
			ruleName: rule.name,
			discountType: rule.type,
			discountValue: Number(rule.value),
			discountAmount,
		});
	}

	const finalPrice = Math.max(0, basePrice - totalDiscount);

	return {
		originalPrice: basePrice,
		discountAmount: totalDiscount,
		finalPrice,
		appliedRules,
	};
};
