import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { productUom } from "@/db/schema/products";
import { uom, uomConversion } from "@/db/schema/uom";
import type {
	CreateUomConversionInput,
	CreateUomInput,
	UpdateUomConversionInput,
	UpdateUomInput,
} from "@/dto/uom";
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

/**
 * Create a new Unit of Measure
 * @param input UOM creation data
 * @returns Created UOM
 */
export const createUom = async (input: CreateUomInput) => {
	const { code } = input;

	// Check if UOM code already exists
	const existingUom = await db.query.uom.findFirst({
		where: eq(uom.code, code),
	});

	if (existingUom) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `UOM with code "${code}" already exists`,
		});
	}

	// Create the UOM
	const newUom = await db
		.insert(uom)
		.values({
			code,
			name: input.name,
			system: input.system,
			category: input.category,
			isPackaging: input.isPackaging,
		})
		.returning();

	if (!newUom[0]) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create UOM",
		});
	}

	return newUom[0];
};

/**
 * Update an existing Unit of Measure
 * @param input UOM update data (code is required, other fields optional)
 * @returns Updated UOM
 */
export const updateUom = async (input: UpdateUomInput) => {
	const { code } = input;

	// Check if UOM exists
	const existingUom = await db.query.uom.findFirst({
		where: eq(uom.code, code),
	});

	if (!existingUom) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `UOM with code "${code}" not found`,
		});
	}

	// Update the UOM
	const updateData: Partial<typeof input> = {
		...input,
		code: undefined, // code is primary key and cannot be updated
	};

	// Remove undefined values
	Object.keys(updateData).forEach((key) => {
		if (updateData[key as keyof typeof updateData] === undefined) {
			delete updateData[key as keyof typeof updateData];
		}
	});

	const updatedUom = await db
		.update(uom)
		.set(updateData)
		.where(eq(uom.code, code))
		.returning();

	if (!updatedUom[0]) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to update UOM",
		});
	}

	return updatedUom[0];
};

/**
 * Create a new UOM conversion factor
 * @param input UOM conversion data
 * @returns Created UOM conversion
 */
export const createUomConversion = async (input: CreateUomConversionInput) => {
	const { fromUom: fromUomCode, toUom: toUomCode } = input;

	// Validate that UOMs exist
	const fromUomExists = await db.query.uom.findFirst({
		where: eq(uom.code, fromUomCode),
	});

	const toUomExists = await db.query.uom.findFirst({
		where: eq(uom.code, toUomCode),
	});

	if (!fromUomExists) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Source UOM "${fromUomCode}" not found`,
		});
	}

	if (!toUomExists) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Target UOM "${toUomCode}" not found`,
		});
	}

	// Check if conversion already exists
	const existingConversion = await db.query.uomConversion.findFirst({
		where: and(
			eq(uomConversion.fromUom, fromUomCode),
			eq(uomConversion.toUom, toUomCode),
		),
	});

	if (existingConversion) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Conversion from "${fromUomCode}" to "${toUomCode}" already exists`,
		});
	}

	// Create the conversion
	try {
		const newConversion = await db
			.insert(uomConversion)
			.values({
				fromUom: fromUomCode,
				toUom: toUomCode,
				factor: input.factor,
			})
			.returning();

		if (!newConversion[0]) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to create UOM conversion",
			});
		}

		return newConversion[0];
	} catch (error) {
		// Handle unique constraint violation or other database errors
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create UOM conversion",
		});
	}
};

/**
 * Update an existing UOM conversion factor
 * @param input UOM conversion update data
 * @returns Updated UOM conversion
 */
export const updateUomConversion = async (input: UpdateUomConversionInput) => {
	const { fromUom: fromUomCode, toUom: toUomCode } = input;

	// Check if conversion exists
	const existingConversion = await db.query.uomConversion.findFirst({
		where: and(
			eq(uomConversion.fromUom, fromUomCode),
			eq(uomConversion.toUom, toUomCode),
		),
	});

	if (!existingConversion) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Conversion from "${fromUomCode}" to "${toUomCode}" not found`,
		});
	}

	// Update the conversion
	const updateData: Partial<typeof input> = {
		...input,
		fromUom: undefined, // composite primary key cannot be updated
		toUom: undefined,
	};

	// Remove undefined values
	Object.keys(updateData).forEach((key) => {
		if (updateData[key as keyof typeof updateData] === undefined) {
			delete updateData[key as keyof typeof updateData];
		}
	});

	const updatedConversion = await db
		.update(uomConversion)
		.set(updateData)
		.where(
			and(
				eq(uomConversion.fromUom, fromUomCode),
				eq(uomConversion.toUom, toUomCode),
			),
		)
		.returning();

	if (!updatedConversion[0]) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to update UOM conversion",
		});
	}

	return updatedConversion[0];
};
