import { z } from "zod";
import {
	calculateDiscount,
	createDiscountRule,
	createPriceList,
	createProductPrice,
	getActivePrice,
	updateDiscountRule,
	updatePriceList,
	updateProductPrice,
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
			.query(({ input, ctx }) => {
				return priceServices.calculateDiscount(input, ctx.organizationId);
			}),
	}),
});
