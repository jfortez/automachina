import { z } from "zod";

// Base UOM schema
const baseUom = z.object({
	code: z.string().min(1).max(20),
	name: z.string().min(1),
	system: z.enum(["UNECE", "UCUM"]),
	category: z.enum([
		"count",
		"mass",
		"volume",
		"length",
		"area",
		"time",
		"other",
	]),
	isPackaging: z.boolean().default(false),
});

// UOM schemas
export const createUom = baseUom;

export const createUomWithConversions = baseUom.extend({
	conversions: z
		.array(
			z.object({
				toUom: z.string().min(1),
				factor: z.string(), // Using string for precise decimal handling
			}),
		)
		.optional(),
});

export const updateUom = createUom.partial().extend({
	code: z.string().min(1).max(20),
});

// UOM state management schemas
export const deactivateUom = z.object({
	code: z.string().min(1).max(20),
});

// UOM Conversion schemas
export const createUomConversion = z.object({
	fromUom: z.string().min(1),
	toUom: z.string().min(1),
	factor: z.string(), // Using string for precise decimal handling
});

export const updateUomConversion = createUomConversion.partial().extend({
	fromUom: z.string().min(1),
	toUom: z.string().min(1),
});

// Options for queries
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
