import { z } from "zod";
import {
	createProduct,
	createProductCategory,
	getProductStockSchema,
	updateProductCategory,
} from "@/dto/product";
import { protectedProcedure, publicProcedure, router } from "@/lib/trpc";
import * as productServices from "@/services/product";

export const productRouter = router({
	getAll: publicProcedure.query(productServices.getAllProducts),
	getById: publicProcedure.input(z.string()).query(({ input }) => {
		return productServices.getProductById(input);
	}),
	getByOrg: protectedProcedure.query(({ ctx }) => {
		return productServices.getProductsByOrg(ctx.organizationId);
	}),
	create: protectedProcedure.input(createProduct).mutation(({ input, ctx }) => {
		return productServices.createProduct(input, ctx.organizationId);
	}),
	getStock: protectedProcedure
		.input(getProductStockSchema)
		.query(({ input, ctx }) => {
			return productServices.getProductStock(input, ctx.organizationId);
		}),
	category: router({
		getAll: publicProcedure.query(productServices.getAllProductCategories),
		getAllByOrg: protectedProcedure.query(({ ctx }) => {
			return productServices.getAllProductCategoriesByOrg(ctx.organizationId);
		}),
		getById: publicProcedure.input(z.string()).query(({ input }) => {
			return productServices.getProductCategoryById(input);
		}),
		getByCode: publicProcedure.input(z.string()).query(({ input }) => {
			return productServices.getProductCategoryByCode(input);
		}),
		create: protectedProcedure
			.input(createProductCategory)
			.mutation(({ input, ctx }) => {
				return productServices.createProductCategory(input, ctx.organizationId);
			}),
		update: protectedProcedure
			.input(updateProductCategory)
			.mutation(({ input }) => {
				return productServices.updateProductCategory(input);
			}),
		delete: protectedProcedure.input(z.string()).mutation(({ input }) => {
			return productServices.deleteProductCategory(input);
		}),
	}),
});
