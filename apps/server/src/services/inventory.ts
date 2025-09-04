import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { handlingUnits } from "@/db/schema/handlingUnits";
import { inventoryLedger } from "@/db/schema/inventory";
import { product as productTable, productUom } from "@/db/schema/products";
import { uom, uomConversion } from "@/db/schema/uom";
import type { ReceiveInventoryInput, SellProductInput } from "@/dto/inventory";
import { _getStock } from "./product";

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

		// Convert qty to baseUom
		let qtyInBase = d.qty;
		if (d.uomCode !== prod.baseUom) {
			// Prioritize productUom
			const [productUomRecord] = await tx
				.select({ qtyInBase: productUom.qtyInBase })
				.from(productUom)
				.where(
					sql`${productUom.productId} = ${d.productId} AND ${productUom.uomCode} = ${d.uomCode}`,
				)
				.limit(1);

			if (productUomRecord) {
				qtyInBase = d.qty * Number(productUomRecord.qtyInBase);
			} else {
				// Fallback to uomConversion
				const [conversion] = await tx
					.select({ factor: uomConversion.factor })
					.from(uomConversion)
					.where(
						sql`${uomConversion.fromUom} = ${d.uomCode} AND ${uomConversion.toUom} = ${prod.baseUom}`,
					)
					.limit(1);
				if (!conversion) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `No conversion from ${d.uomCode} to ${prod.baseUom}`,
					});
				}
				qtyInBase = d.qty * Number(conversion.factor);
			}
		}

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

		// Calculate total qtyInBase to sell and store conversions
		let totalQtyToSellInBase = 0;
		const lineConversions: { [key: string]: number } = {};
		for (const line of d.lines) {
			let lineQtyInBase = line.qty;
			if (line.uomCode !== prod.baseUom) {
				const [productUomRecord] = await tx
					.select({ qtyInBase: productUom.qtyInBase })
					.from(productUom)
					.where(
						sql`${productUom.productId} = ${d.productId} AND ${productUom.uomCode} = ${line.uomCode}`,
					)
					.limit(1);

				if (productUomRecord) {
					lineQtyInBase = line.qty * Number(productUomRecord.qtyInBase);
					lineConversions[line.uomCode] = Number(productUomRecord.qtyInBase);
				} else {
					const [conversion] = await tx
						.select({ factor: uomConversion.factor })
						.from(uomConversion)
						.where(
							sql`${uomConversion.fromUom} = ${line.uomCode} AND ${uomConversion.toUom} = ${prod.baseUom}`,
						)
						.limit(1);
					if (!conversion) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `No conversion from ${line.uomCode} to ${prod.baseUom}`,
						});
					}
					lineQtyInBase = line.qty * Number(conversion.factor);
					lineConversions[line.uomCode] = Number(conversion.factor);
				}
			} else {
				lineConversions[line.uomCode] = 1;
			}
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
