import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { productUom } from "@/db/schema/products";
import { uom, uomConversion } from "@/db/schema/uom";
import type { Transaction } from "@/types";

export const getAllUom = async () => {
	const allUom = await db.query.uom.findMany();
	return allUom;
};

export const getUomByCode = async (code: string) => {
	const uomItem = await db.query.uom.findFirst({
		where: eq(uom.code, code),
	});
	return uomItem;
};

/**
 * Converts quantity from given UoM to product's base UoM
 * @param tx Database transaction
 * @param productId Product ID to get conversions for
 * @param qty Quantity in the given UoM
 * @param uomCode UoM code to convert from
 * @param productBaseUom Base UoM of the product (used for validation)
 * @returns Quantity converted to base UoM
 */
export const convertUomToBase = async (
	tx: Transaction,
	productId: string,
	qty: number,
	uomCode: string,
	productBaseUom: string,
): Promise<number> => {
	// If already in base UoM, return as-is
	if (uomCode === productBaseUom) {
		return qty;
	}

	// Prioritize productUom (product-specific conversions)
	const [productUomRecord] = await tx
		.select({ qtyInBase: productUom.qtyInBase })
		.from(productUom)
		.where(
			and(eq(productUom.productId, productId), eq(productUom.uomCode, uomCode)),
		)
		.limit(1);

	if (productUomRecord) {
		return qty * Number(productUomRecord.qtyInBase);
	}

	// Fallback to uomConversion (global standard conversions)
	const [conversion] = await tx
		.select({ factor: uomConversion.factor })
		.from(uomConversion)
		.where(
			and(
				eq(uomConversion.fromUom, uomCode),
				eq(uomConversion.toUom, productBaseUom),
			),
		)
		.limit(1);

	if (!conversion) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `No conversion from ${uomCode} to ${productBaseUom}`,
		});
	}

	return qty * Number(conversion.factor);
};

/**
 * Get UoM conversion factor from base UoM to target UoM
 * @param tx Database transaction
 * @param productId Product ID for product-specific conversions
 * @param fromUomCode Source UoM code (from base)
 * @param toUomCode Target UoM code (to target)
 * @returns Conversion factor
 */
export const getUomConversionFactor = async (
	tx: Transaction,
	productId: string,
	fromUomCode: string, // from UoM
	toUomCode: string, // to UoM
): Promise<number> => {
	// If converting to same UoM
	if (fromUomCode === toUomCode) {
		return 1;
	}

	// Prioritize productUom (product-specific conversions)
	// Find the record for the target UoM (toUomCode)
	const [productUomRecord] = await tx
		.select({ qtyInBase: productUom.qtyInBase })
		.from(productUom)
		.where(
			and(
				eq(productUom.productId, productId),
				eq(productUom.uomCode, toUomCode),
			),
		)
		.limit(1);

	if (productUomRecord) {
		// productUom.qtyInBase tells us how many baseUom units are in 1 toUomCode
		// If toUomCode is "PK" and qtyInBase is 6, then 1 PK = 6 baseUom units
		return Number(productUomRecord.qtyInBase);
	}

	// Fallback to uomConversion (global standard conversions)
	const [conversion] = await tx
		.select({ factor: uomConversion.factor })
		.from(uomConversion)
		.where(
			and(
				eq(uomConversion.fromUom, toUomCode),
				eq(uomConversion.toUom, fromUomCode),
			),
		)
		.limit(1);

	if (!conversion) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `No conversion from ${fromUomCode} to ${toUomCode}`,
		});
	}

	return Number(conversion.factor);
};
