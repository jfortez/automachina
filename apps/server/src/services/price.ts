import { TRPCError } from "@trpc/server";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema/customer";
import type { DiscountConditions } from "@/db/schema/products";
import {
	type discountAppliesTo,
	discountRule,
	type discountTypes,
	priceList,
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
import { discountConditionsSchema } from "@/dto/price";

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
	// Validate conditions using Zod schema
	const conditionsValidation = discountConditionsSchema.safeParse(
		data.conditions,
	);
	if (!conditionsValidation.success) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Invalid conditions: ${conditionsValidation.error.message}`,
		});
	}

	// Validate value based on type
	if (data.type === "percentage" && data.value > 100) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Percentage discount cannot exceed 100%",
		});
	}

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
			maxUses: data.maxUses,
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
 * Checks if a discount rule meets the specified conditions
 * @param rule - The discount rule to check
 * @param qty - The quantity being purchased
 * @param uomCode - The unit of measure being purchased
 * @param orderTotal - The total order amount (basePrice * qty)
 * @returns True if the rule meets all conditions, false otherwise
 */
const checkConditions = (
	rule: typeof discountRule.$inferSelect,
	qty: number,
	uomCode: string,
	orderTotal: number,
): boolean => {
	const conditions = rule.conditions;

	if (!conditions || Object.keys(conditions).length === 0) {
		return true;
	}

	if (conditions.minQty !== undefined && qty < conditions.minQty) {
		return false;
	}

	if (conditions.maxQty !== undefined && qty > conditions.maxQty) {
		return false;
	}

	if (conditions.uomCodes !== undefined && conditions.uomCodes.length > 0) {
		if (!conditions.uomCodes.includes(uomCode)) {
			return false;
		}
	}

	if (
		conditions.minOrderTotal !== undefined &&
		orderTotal < conditions.minOrderTotal
	) {
		return false;
	}

	if (conditions.daysOfWeek !== undefined && conditions.daysOfWeek.length > 0) {
		const dayOfWeek = new Intl.DateTimeFormat("en-US", {
			weekday: "long",
		}).format(new Date());
		if (!conditions.daysOfWeek.includes(dayOfWeek)) {
			return false;
		}
	}

	return true;
};

/**
 * Calculates tiered discount amount based on quantity
 * @param qty - The quantity being purchased
 * @param conditions - The discount conditions containing tiers
 * @param basePrice - The base price for calculation
 * @returns The discount amount if tiered, undefined otherwise
 */
const calculateTieredDiscount = (
	qty: number,
	conditions: DiscountConditions,
	basePrice: number,
): number | undefined => {
	if (!conditions.tiers || conditions.tiers.length === 0) {
		return undefined;
	}

	const matchingTier = conditions.tiers.find(
		(tier) =>
			qty >= tier.minQty && (tier.maxQty === undefined || qty <= tier.maxQty),
	);

	if (!matchingTier) {
		return undefined;
	}

	return matchingTier.type === "percentage"
		? basePrice * (matchingTier.discount / 100)
		: matchingTier.discount;
};

export const calculateDiscount = async (
	input: CalculateDiscountInput,
	organizationId: string,
) => {
	const { productId, basePrice, qty, priceListId, customerId, uomCode } = input;
	const now = new Date();

	const productData = await db.query.product.findFirst({
		where: and(
			eq(product.id, productId),
			eq(product.organizationId, organizationId),
		),
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
			eq(discountRule.organizationId, organizationId),
			eq(discountRule.isActive, true),
			or(isNull(discountRule.startAt), lte(discountRule.startAt, now)),
			or(isNull(discountRule.endAt), gte(discountRule.endAt, now)),
		),
	});

	const orderTotal = basePrice * qty;

	const applicableRules = allRules.filter((rule) => {
		if (!checkConditions(rule, qty, uomCode, orderTotal)) {
			return false;
		}

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
				best.type === "tiered"
					? (calculateTieredDiscount(qty, best.conditions, basePrice) ?? 0)
					: best.type === "percentage"
						? basePrice * (Number(best.value) / 100)
						: Number(best.value);
			const currentDiscount =
				current.type === "tiered"
					? (calculateTieredDiscount(qty, current.conditions, basePrice) ?? 0)
					: current.type === "percentage"
						? basePrice * (Number(current.value) / 100)
						: Number(current.value);
			return currentDiscount > bestDiscount ? current : best;
		});

		const discountAmount =
			bestRule.type === "tiered"
				? (calculateTieredDiscount(qty, bestRule.conditions, basePrice) ?? 0)
				: bestRule.type === "percentage"
					? basePrice * (Number(bestRule.value) / 100)
					: Number(bestRule.value);

		totalDiscount += discountAmount;
		appliedRules.push({
			ruleId: bestRule.id,
			ruleName: bestRule.name,
			discountType: bestRule.type,
			discountValue:
				bestRule.type === "tiered"
					? (calculateTieredDiscount(qty, bestRule.conditions, basePrice) ?? 0)
					: Number(bestRule.value),
			discountAmount,
		});
	}

	for (const rule of combinableRules) {
		const discountAmount =
			rule.type === "tiered"
				? (calculateTieredDiscount(qty, rule.conditions, basePrice) ?? 0)
				: rule.type === "percentage"
					? basePrice * (Number(rule.value) / 100)
					: Number(rule.value);

		totalDiscount += discountAmount;
		appliedRules.push({
			ruleId: rule.id,
			ruleName: rule.name,
			discountType: rule.type,
			discountValue:
				rule.type === "tiered"
					? (calculateTieredDiscount(qty, rule.conditions, basePrice) ?? 0)
					: Number(rule.value),
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

/**
 * Validates security permissions for discount calculation
 * Checks if customer and price list belong to the organization
 */
const validateDiscountSecurity = async (
	customerId: string | undefined,
	priceListId: string | undefined,
	organizationId: string,
): Promise<void> => {
	if (customerId) {
		const customer = await db.query.customers.findFirst({
			where: and(
				eq(customers.id, customerId),
				eq(customers.organizationId, organizationId),
			),
		});
		if (!customer) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Customer not found or does not belong to this organization",
			});
		}
	}

	if (priceListId) {
		const priceListData = await db.query.priceList.findFirst({
			where: and(
				eq(priceList.id, priceListId),
				eq(priceList.organizationId, organizationId),
			),
		});
		if (!priceListData) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Price list not found or does not belong to this organization",
			});
		}
	}
};

/**
 * Increments the used count for applicable discount rules
 * Should be called when a discount is actually applied (not just previewed)
 */
export const incrementDiscountUsage = async (
	ruleIds: string[],
	organizationId: string,
): Promise<void> => {
	for (const ruleId of ruleIds) {
		const rule = await db.query.discountRule.findFirst({
			where: and(
				eq(discountRule.id, ruleId),
				eq(discountRule.organizationId, organizationId),
			),
		});

		if (rule && rule.maxUses !== null && rule.maxUses !== undefined) {
			if (rule.usedCount >= rule.maxUses) {
				throw new TRPCError({
					code: "CONFLICT",
					message: `Discount rule ${rule.code} has reached its usage limit`,
				});
			}

			await db
				.update(discountRule)
				.set({ usedCount: rule.usedCount + 1 })
				.where(eq(discountRule.id, ruleId));
		}
	}
};

/**
 * Calculates discounts for multiple order lines
 * @param lines - Array of order lines with product details
 * @param organizationId - The organization ID
 * @returns Array of discount calculations for each line
 */
export const calculateBulkDiscounts = async (
	lines: Array<{
		productId: string;
		basePrice: number;
		qty: number;
		uomCode: string;
		priceListId?: string;
		customerId?: string;
	}>,
	organizationId: string,
) => {
	// Validate security for customer and price list (only once)
	const uniqueCustomers = [
		...new Set(lines.map((l) => l.customerId).filter(Boolean)),
	];
	const uniquePriceLists = [
		...new Set(lines.map((l) => l.priceListId).filter(Boolean)),
	];

	for (const customerId of uniqueCustomers) {
		await validateDiscountSecurity(customerId, undefined, organizationId);
	}
	for (const priceListId of uniquePriceLists) {
		await validateDiscountSecurity(undefined, priceListId, organizationId);
	}

	// Calculate discounts for each line
	const results = await Promise.all(
		lines.map((line) =>
			calculateDiscount(
				{
					productId: line.productId,
					basePrice: line.basePrice,
					qty: line.qty,
					uomCode: line.uomCode,
					priceListId: line.priceListId,
					customerId: line.customerId,
				},
				organizationId,
			),
		),
	);

	return results;
};

/**
 * Previews applicable discounts without incrementing usage counters
 * @param input - The calculation input
 * @param organizationId - The organization ID
 * @returns Discount calculation result
 */
export const previewDiscount = async (
	input: CalculateDiscountInput,
	organizationId: string,
) => {
	await validateDiscountSecurity(
		input.customerId,
		input.priceListId,
		organizationId,
	);

	return calculateDiscount(input, organizationId);
};

/**
 * Validates if a discount rule is applicable for the given parameters
 * @param code - The discount rule code
 * @param input - The calculation input parameters
 * @param organizationId - The organization ID
 * @returns Validation result with details
 */
export const validateDiscount = async (
	code: string,
	input: CalculateDiscountInput,
	organizationId: string,
) => {
	const now = new Date();

	// Find the discount rule
	const rule = await db.query.discountRule.findFirst({
		where: and(
			eq(discountRule.code, code),
			eq(discountRule.organizationId, organizationId),
		),
	});

	if (!rule) {
		return {
			isValid: false,
			reason: "Discount rule not found",
		};
	}

	// Check if active
	if (!rule.isActive) {
		return {
			isValid: false,
			reason: "Discount rule is inactive",
		};
	}

	// Check time limits
	if (rule.startAt && now < rule.startAt) {
		return {
			isValid: false,
			reason: "Discount rule has not started yet",
		};
	}

	if (rule.endAt && now > rule.endAt) {
		return {
			isValid: false,
			reason: "Discount rule has expired",
		};
	}

	// Check usage limits
	if (rule.maxUses !== null && rule.maxUses !== undefined) {
		if (rule.usedCount >= rule.maxUses) {
			return {
				isValid: false,
				reason: "Discount rule has reached its usage limit",
			};
		}
	}

	// Check if applies to this product/customer/price list
	const productData = await db.query.product.findFirst({
		where: and(
			eq(product.id, input.productId),
			eq(product.organizationId, organizationId),
		),
		columns: {
			id: true,
			categoryId: true,
		},
	});

	if (!productData) {
		return {
			isValid: false,
			reason: "Product not found",
		};
	}

	let appliesToTarget = false;
	switch (rule.appliesTo) {
		case "global":
			appliesToTarget = true;
			break;
		case "product":
			appliesToTarget = rule.appliesToId === input.productId;
			break;
		case "category":
			appliesToTarget = rule.appliesToId === productData.categoryId;
			break;
		case "price_list":
			appliesToTarget = input.priceListId
				? rule.appliesToId === input.priceListId
				: false;
			break;
		case "customer":
			appliesToTarget = input.customerId
				? rule.appliesToId === input.customerId
				: false;
			break;
	}

	if (!appliesToTarget) {
		return {
			isValid: false,
			reason: "Discount rule does not apply to this target",
		};
	}

	// Check conditions
	const orderTotal = input.basePrice * input.qty;
	const conditionsMet = checkConditions(
		rule,
		input.qty,
		input.uomCode,
		orderTotal,
	);

	if (!conditionsMet) {
		return {
			isValid: false,
			reason: "Conditions not met for this discount rule",
		};
	}

	return {
		isValid: true,
		rule: {
			id: rule.id,
			code: rule.code,
			name: rule.name,
			type: rule.type,
			value: Number(rule.value),
		},
	};
};
