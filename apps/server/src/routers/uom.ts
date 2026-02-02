import z from "zod";
import {
	createUomConversion as createUomConversionSchema,
	createUom as createUomSchema,
	createUomWithConversions as createUomWithConversionsSchema,
	deactivateUom as deactivateUomSchema,
	updateUomConversion as updateUomConversionSchema,
	updateUom as updateUomSchema,
} from "@/dto/uom";
import { protectedProcedure, publicProcedure, router } from "@/lib/trpc";
import {
	activateUom,
	createUom,
	createUomConversion,
	createUomWithConversions,
	deactivateUom,
	getAllUom,
	getUomByCode,
	updateUom,
	updateUomConversion,
} from "@/services/uom";

export const uomRouter = router({
	// Public endpoints - only active UOMs
	getAll: publicProcedure.query(() => getAllUom(false)),
	getByCode: publicProcedure
		.input(z.string())
		.query((opts) => getUomByCode(opts.input, false)),

	// Admin endpoints - includes inactive UOMs (for administrative purposes)
	getAllIncludingInactive: protectedProcedure.query(() => getAllUom(true)),
	getByCodeIncludingInactive: protectedProcedure
		.input(z.string())
		.query((opts) => getUomByCode(opts.input, true)),

	// UOM CRUD operations
	create: protectedProcedure
		.input(createUomSchema)
		.mutation(({ input }) => createUom(input)),
	createWithConversions: protectedProcedure
		.input(createUomWithConversionsSchema)
		.mutation(({ input }) => createUomWithConversions(input)),
	update: protectedProcedure
		.input(updateUomSchema)
		.mutation(({ input }) => updateUom(input)),
	deactivate: protectedProcedure
		.input(deactivateUomSchema)
		.mutation(({ input }) => deactivateUom(input)),
	activate: protectedProcedure
		.input(z.string())
		.mutation(({ input }) => activateUom(input)),

	// UOM Conversion operations
	conversion: router({
		create: protectedProcedure
			.input(createUomConversionSchema)
			.mutation(({ input }) => createUomConversion(input)),
		update: protectedProcedure
			.input(updateUomConversionSchema)
			.mutation(({ input }) => updateUomConversion(input)),
	}),
});
