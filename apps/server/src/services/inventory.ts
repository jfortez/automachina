import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { handlingUnits } from "@/db/schema/handlingUnits";
import { inventoryLedger } from "@/db/schema/inventory";
import { product as productTable, productUom } from "@/db/schema/products";
import { uom, uomConversion } from "@/db/schema/uom";
import type {
	AdjustInventoryInput,
	ReceiveInventoryInput,
	SellProductInput,
} from "@/dto/inventory";
import type { Transaction } from "@/types";
import { _getStock } from "./product";

/**
 * Converts quantity from given UoM to product's base UoM
 * @param tx Database transaction
 * @param productId Product ID to get conversions for
 * @param qty Quantity in the given UoM
 * @param uomCode UoM code to convert from
 * @param productBaseUom Base UoM of the product (used for validation)
 * @returns Quantity converted to base UoM
 */
const _convertUomToBase = async (
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
			sql`${productUom.productId} = ${productId} AND ${productUom.uomCode} = ${uomCode}`,
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
			sql`${uomConversion.fromUom} = ${uomCode} AND ${uomConversion.toUom} = ${productBaseUom}`,
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

export const receiveInventory = async (d: ReceiveInventoryInput) => {
	return await db.transaction(async (tx) => {
		// Get product details
		const [prod] = await tx
			.select()
			.from(productTable)
			.where(eq(productTable.id, d.productId));
		if (!prod) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
		}
		if (!prod.isPhysical) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Cannot receive inventory for non-physical products",
			});
		}

		// Convert qty to baseUom using helper function
		const qtyInBase = await _convertUomToBase(
			tx,
			d.productId,
			d.qty,
			d.uomCode,
			prod.baseUom,
		);

		// Insert receipt in inventory_ledger
		await tx.insert(inventoryLedger).values({
			organizationId: d.organizationId,
			occurredAt: new Date(),
			movementType: "receipt",
			productId: d.productId,
			warehouseId: d.warehouseId,
			qtyInBase: qtyInBase.toString(),
			uomCode: d.uomCode,
			qtyInUom: d.qty.toString(),
			unitCost: d.cost?.toString(),
			currency: d.currency,
		});

		return { success: true, productId: d.productId, qtyInBase };
	});
};
export const sellProduct = async (
	d: SellProductInput & { returnTotalQty?: boolean },
) => {
	return await db.transaction(async (tx) => {
		// Get product details
		const [prod] = await tx
			.select()
			.from(productTable)
			.where(eq(productTable.id, d.productId));
		if (!prod) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
		}
		if (!prod.isPhysical) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Cannot sell non-physical products",
			});
		}

		// Calculate total qtyInBase to sell using helper function
		let totalQtyToSellInBase = 0;
		const lineConversions: { [key: string]: number } = {};
		for (const line of d.lines) {
			const lineQtyInBase = await _convertUomToBase(
				tx,
				d.productId,
				line.qty,
				line.uomCode,
				prod.baseUom,
			);

			// Store conversion factor for later use in ledger insertion
			lineConversions[line.uomCode] = lineQtyInBase / line.qty;
			totalQtyToSellInBase += lineQtyInBase;
		}

		// Get current stock in base
		const stock = await _getStock(
			{
				organizationId: d.organizationId,
				productId: d.productId,
				warehouseId: d.warehouseId,
			},
			tx,
		);
		const currentStockInBase = Number(stock?.totalQty || 0);

		if (currentStockInBase < totalQtyToSellInBase) {
			const unpackQtyNeeded = totalQtyToSellInBase - currentStockInBase;
			const [packageUom] = await tx
				.select()
				.from(productUom)
				.where(
					sql`${productUom.productId} = ${d.productId} AND ${productUom.uomCode} IN (SELECT ${uom.code} FROM ${uom} WHERE ${uom.isPackaging} = true)`,
				)
				.limit(1);

			if (packageUom) {
				const packagesNeeded = Math.ceil(
					unpackQtyNeeded / Number(packageUom.qtyInBase),
				);
				const availablePackages = await tx
					.select({ count: sql`COUNT(*)` })
					.from(handlingUnits)
					.where(
						sql`${handlingUnits.uomCode} = ${packageUom.uomCode} AND ${handlingUnits.organizationId} = ${d.organizationId}`,
					);

				if (Number(availablePackages[0].count) >= packagesNeeded) {
					const qtyToUnpack = packagesNeeded * Number(packageUom.qtyInBase);

					await tx.insert(inventoryLedger).values([
						{
							organizationId: d.organizationId,
							productId: d.productId,
							movementType: "disassembly_out",
							qtyInBase: qtyToUnpack.toString(), // Positivo
							uomCode: packageUom.uomCode,
							qtyInUom: packagesNeeded.toString(),
							occurredAt: new Date(),
						},
						{
							organizationId: d.organizationId,
							productId: d.productId,
							movementType: "disassembly_in",
							qtyInBase: qtyToUnpack.toString(), // Positivo
							uomCode: prod.baseUom,
							qtyInUom: qtyToUnpack.toString(),
							occurredAt: new Date(),
						},
					]);
				} else {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Insufficient packages to unpack",
					});
				}
			} else {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Insufficient stock and no packages available",
				});
			}
		}

		// Register sales (issue) for each line with positive qtyInBase
		for (const line of d.lines) {
			const lineQtyInBase = line.qty * (lineConversions[line.uomCode] || 1);

			await tx.insert(inventoryLedger).values({
				organizationId: d.organizationId,
				occurredAt: new Date(),
				movementType: "issue",
				productId: d.productId,
				warehouseId: d.warehouseId,
				qtyInBase: lineQtyInBase.toString(), // Positivo
				uomCode: line.uomCode,
				qtyInUom: line.qty.toString(),
			});
		}

		const result = {
			success: true,
			productId: d.productId,
			uomCode: prod.baseUom,
			totalQty: 0,
		};

		if (d.returnTotalQty) {
			const updatedStock = await _getStock(
				{
					organizationId: d.organizationId,
					productId: d.productId,
					warehouseId: d.warehouseId,
				},
				tx,
			);
			result.totalQty = Number(updatedStock?.totalQty || 0);
		} else {
			delete (result as Partial<typeof result>).totalQty;
		}

		return result;
	});
};

export const adjustInventory = async (d: AdjustInventoryInput) => {
	return await db.transaction(async (tx) => {
		// Get product details
		const [prod] = await tx
			.select()
			.from(productTable)
			.where(eq(productTable.id, d.productId));
		if (!prod) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
		}
		if (!prod.isPhysical) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Cannot adjust inventory for non-physical products",
			});
		}

		// Convert qty to baseUom using helper function
		const qtyInBase = await _convertUomToBase(
			tx,
			d.productId,
			d.qty,
			d.uomCode,
			prod.baseUom,
		);

		// For negative adjustments, validate sufficient stock
		if (d.adjustmentType === "neg") {
			const currentStock = await _getStock(
				{
					organizationId: d.organizationId,
					productId: d.productId,
					warehouseId: d.warehouseId,
				},
				tx,
			);
			const currentStockInBase = Number(currentStock?.totalQty || 0);

			if (currentStockInBase < qtyInBase) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Cannot adjust negative: insufficient stock (${currentStockInBase}) for adjustment (${qtyInBase})`,
				});
			}
		}

		// Insert adjustment in inventory_ledger
		const movementType =
			d.adjustmentType === "pos" ? "adjustment_pos" : "adjustment_neg";

		// Combine notes, reason, and physicalCountId into the note field
		const auditTrail = [
			d.notes,
			d.reason && `Reason: ${d.reason}`,
			d.physicalCountId && `Physical Count ID: ${d.physicalCountId}`,
		]
			.filter(Boolean)
			.join(" | ");

		await tx.insert(inventoryLedger).values({
			organizationId: d.organizationId,
			occurredAt: new Date(),
			movementType,
			productId: d.productId,
			warehouseId: d.warehouseId,
			qtyInBase: qtyInBase.toString(),
			uomCode: d.uomCode,
			qtyInUom: d.qty.toString(),
			note: auditTrail || null,
		});

		return {
			success: true,
			productId: d.productId,
			qtyAdjustedInBase: qtyInBase,
		};
	});
};
