import { z } from "zod";
import {
	bulkCalculateDiscount,
	calculateDiscount,
	createDiscountRule,
	createPriceList,
	createProductPrice,
	getActivePrice,
	previewDiscount,
	updateDiscountRule,
	updatePriceList,
	updateProductPrice,
	validateDiscount,
} from "@/dto/price";
import { protectedProcedure, router } from "@/lib/trpc";
import * as priceServices from "@/services/price";

export const priceRouter = router({
	list: router({
		getAll: protectedProcedure.query(({ ctx }) => {
			return priceServices.getAllPriceLists(ctx.organizationId);
		}),

		getById: protectedProcedure.input(z.string()).query(({ input }) => {
			return priceServices.getPriceListById(input);
		}),

		getByCode: protectedProcedure.input(z.string()).query(({ input, ctx }) => {
			return priceServices.getPriceListByCode(input, ctx.organizationId);
		}),

		create: protectedProcedure
			.input(createPriceList)
			.mutation(({ input, ctx }) => {
				return priceServices.createPriceList(input, ctx.organizationId);
			}),

		update: protectedProcedure.input(updatePriceList).mutation(({ input }) => {
			return priceServices.updatePriceList(input);
		}),

		delete: protectedProcedure.input(z.string()).mutation(({ input }) => {
			return priceServices.deletePriceList(input);
		}),
	}),

	product: router({
		getByProduct: protectedProcedure.input(z.string()).query(({ input }) => {
			return priceServices.getPricesByProduct(input);
		}),

		getByPriceList: protectedProcedure.input(z.string()).query(({ input }) => {
			return priceServices.getPricesByPriceList(input);
		}),

		getActive: protectedProcedure.input(getActivePrice).query(({ input }) => {
			return priceServices.getActivePrice(input);
		}),

		create: protectedProcedure
			.input(createProductPrice)
			.mutation(({ input, ctx }) => {
				return priceServices.createProductPrice(input, ctx.organizationId);
			}),

		update: protectedProcedure
			.input(updateProductPrice)
			.mutation(({ input }) => {
				return priceServices.updateProductPrice(input);
			}),

		delete: protectedProcedure.input(z.string()).mutation(({ input }) => {
			return priceServices.deleteProductPrice(input);
		}),
	}),

	discount: router({
		getAll: protectedProcedure.query(({ ctx }) => {
			return priceServices.getAllDiscountRules(ctx.organizationId);
		}),

		getById: protectedProcedure.input(z.string()).query(({ input, ctx }) => {
			return priceServices.getDiscountRuleById(input, ctx.organizationId);
		}),

		create: protectedProcedure
			.input(createDiscountRule)
			.mutation(({ input, ctx }) => {
				return priceServices.createDiscountRule(input, ctx.organizationId);
			}),

		update: protectedProcedure
			.input(updateDiscountRule)
			.mutation(({ input, ctx }) => {
				return priceServices.updateDiscountRule(input, ctx.organizationId);
			}),

		delete: protectedProcedure.input(z.string()).mutation(({ input, ctx }) => {
			return priceServices.deleteDiscountRule(input, ctx.organizationId);
		}),

		calculate: protectedProcedure
			.input(calculateDiscount)
			.mutation(async ({ input, ctx }) => {
				const result = await priceServices.calculateDiscount(
					input,
					ctx.organizationId,
				);
				if (result.appliedRules.length > 0) {
					await priceServices.incrementDiscountUsage(
						result.appliedRules.map((r) => r.ruleId),
						ctx.organizationId,
					);
				}
				return result;
			}),

		calculateBulk: protectedProcedure
			.input(bulkCalculateDiscount)
			.mutation(async ({ input, ctx }) => {
				const results = await priceServices.calculateBulkDiscounts(
					input.lines,
					ctx.organizationId,
				);
				// Increment usage for all applied rules
				const allRuleIds = results
					.flatMap((r) => r.appliedRules)
					.map((r) => r.ruleId);
				if (allRuleIds.length > 0) {
					await priceServices.incrementDiscountUsage(
						allRuleIds,
						ctx.organizationId,
					);
				}
				return results;
			}),

		preview: protectedProcedure
			.input(previewDiscount)
			.query(({ input, ctx }) => {
				return priceServices.previewDiscount(input, ctx.organizationId);
			}),

		validate: protectedProcedure
			.input(validateDiscount)
			.query(({ input, ctx }) => {
				return priceServices.validateDiscount(
					input.code,
					{
						productId: input.productId,
						basePrice: input.basePrice,
						qty: input.qty,
						uomCode: input.uomCode,
						priceListId: input.priceListId,
						customerId: input.customerId,
					},
					ctx.organizationId,
				);
			}),
	}),
});
