import { z } from "zod";
import { UOM_CATEGORIES } from "@/db/schema/uom";

const baseUom = z.object({
	code: z.string().min(1).max(20),
	name: z.string().min(1),
	system: z.enum(["UNECE", "UCUM"]),
	category: z.enum(UOM_CATEGORIES),
	isPackaging: z.boolean().default(false),
});

export const createUom = baseUom;

export const createUomWithConversions = baseUom.extend({
	conversions: z
		.array(
			z.object({
				toUom: z.string().min(1),
				factor: z.string(),
			}),
		)
		.optional(),
});

export const updateUom = createUom.partial().extend({
	code: z.string().min(1).max(20),
});

export const deactivateUom = z.object({
	code: z.string().min(1).max(20),
});

export const createUomConversion = z.object({
	fromUom: z.string().min(1),
	toUom: z.string().min(1),
	factor: z.string(),
});

export const updateUomConversion = createUomConversion.partial().extend({
	fromUom: z.string().min(1),
	toUom: z.string().min(1),
});

export const getUomOptions = z
	.object({
		includeInactive: z.boolean().default(false),
	})
	.optional();

export type CreateUomInput = z.infer<typeof createUom>;
export type CreateUomWithConversionsInput = z.infer<
	typeof createUomWithConversions
>;
export type UpdateUomInput = z.infer<typeof updateUom>;
export type DeactivateUomInput = z.infer<typeof deactivateUom>;
export type CreateUomConversionInput = z.infer<typeof createUomConversion>;
export type UpdateUomConversionInput = z.infer<typeof updateUomConversion>;
export type GetUomOptionsInput = z.infer<typeof getUomOptions>;
