import { TRPCError } from "@trpc/server";
import { and, eq, gte, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
	handlingUnitContents,
	handlingUnitHistory,
	handlingUnits,
} from "@/db/schema/handlingUnits";
import { inventoryLedger } from "@/db/schema/inventory";
import { inventoryReservations } from "@/db/schema/orders";
import { product as productTable, productUom } from "@/db/schema/products";
import { uom } from "@/db/schema/uom";
import { locations } from "@/db/schema/warehouse";
import type {
	AddHandlingUnitContentInput,
	AdjustInventoryInput,
	CreateHandlingUnitInput,
	CreateReservationInput,
	ExtendReservationInput,
	MoveHandlingUnitInput,
	ReceiveInventoryInput,
	ReleaseReservationInput,
	RemoveHandlingUnitContentInput,
	SellProductInput,
} from "@/dto/inventory";
import type { Transaction } from "@/types";
import { _getStock } from "./product";
import { convertUomToBase, convertWeight } from "./uom";

/**
 * Validates product exists and is physical, returns basic product data
 * @param tx Database transaction
 * @param productId Product ID to validate
 * @returns Product basic data or throws error
 */
const _validatePhysicalProduct = async (tx: Transaction, productId: string) => {
	const [prod] = await tx
		.select({
			id: productTable.id,
			baseUom: productTable.baseUom,
			isPhysical: productTable.isPhysical,
		})
		.from(productTable)
		.where(eq(productTable.id, productId));

	if (!prod) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
	}
	if (!prod.isPhysical) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Cannot operate on non-physical products",
		});
	}

	return prod;
};

/**
 * Standardizes inventory ledger insertion
 * @param tx Database transaction
 * @param entryData Ledger entry data (without occurredAt which is auto-generated)
 * @returns Insert result
 */
const _insertLedgerEntry = async (
	tx: Transaction,
	entryData: {
		organizationId: string;
		movementType: string;
		productId: string;
		warehouseId?: string;
		qtyInBase: string;
		uomCode?: string;
		qtyInUom?: string;
		note?: string | null;
		unitCost?: string;
		currency?: string;
	},
) => {
	return await tx.insert(inventoryLedger).values({
		...entryData,
		occurredAt: new Date(),
	});
};

export const receiveInventory = async (
	d: ReceiveInventoryInput,
	organizationId: string,
) => {
	return await db.transaction(async (tx) => {
		// Validate product exists and is physical
		const prod = await _validatePhysicalProduct(tx, d.productId);

		const qtyInBase = await convertUomToBase(
			tx,
			d.productId,
			d.qty,
			d.uomCode,
			prod.baseUom,
		);

		// Insert receipt in inventory_ledger using helper
		await _insertLedgerEntry(tx, {
			organizationId,
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
	organizationId: string,
) => {
	return await db.transaction(async (tx) => {
		// Validate product exists and is physical
		const prod = await _validatePhysicalProduct(tx, d.productId);

		// Calculate total qtyInBase to sell using helper function
		let totalQtyToSellInBase = 0;
		const lineConversions: { [key: string]: number } = {};
		for (const line of d.lines) {
			const lineQtyInBase = await convertUomToBase(
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
				organizationId,
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
						sql`${handlingUnits.uomCode} = ${packageUom.uomCode} AND ${handlingUnits.organizationId} = ${organizationId}`,
					);

				if (Number(availablePackages[0].count) >= packagesNeeded) {
					const qtyToUnpack = packagesNeeded * Number(packageUom.qtyInBase);

					await _insertLedgerEntry(tx, {
						organizationId,
						productId: d.productId,
						movementType: "disassembly_out",
						qtyInBase: qtyToUnpack.toString(),
						uomCode: packageUom.uomCode,
						qtyInUom: packagesNeeded.toString(),
					});
					await _insertLedgerEntry(tx, {
						organizationId,
						productId: d.productId,
						movementType: "disassembly_in",
						qtyInBase: qtyToUnpack.toString(),
						uomCode: prod.baseUom,
						qtyInUom: qtyToUnpack.toString(),
					});
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

			await _insertLedgerEntry(tx, {
				organizationId,
				productId: d.productId,
				warehouseId: d.warehouseId,
				movementType: "issue",
				qtyInBase: lineQtyInBase.toString(),
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
					organizationId,
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

export const adjustInventory = async (
	d: AdjustInventoryInput,
	organizationId: string,
) => {
	return await db.transaction(async (tx) => {
		// Validate product exists and is physical
		const prod = await _validatePhysicalProduct(tx, d.productId);

		// Convert qty to baseUom using helper function
		const qtyInBase = await convertUomToBase(
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
					organizationId,
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

		// Insert adjustment in inventory_ledger using helper
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

		await _insertLedgerEntry(tx, {
			organizationId,
			productId: d.productId,
			warehouseId: d.warehouseId,
			movementType,
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

/**
 * Creates a new handling unit at specified location
 */
export const createHandlingUnit = async (
	data: CreateHandlingUnitInput,
	organizationId: string,
) => {
	const location = await db.query.locations.findFirst({
		where: eq(locations.id, data.locationId),
	});

	if (!location) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Location not found",
		});
	}

	if (data.parentId) {
		const parent = await db.query.handlingUnits.findFirst({
			where: and(
				eq(handlingUnits.id, data.parentId),
				eq(handlingUnits.organizationId, organizationId),
			),
		});

		if (!parent) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Parent handling unit not found",
			});
		}
	}

	const [unit] = await db
		.insert(handlingUnits)
		.values({
			organizationId,
			code: data.code,
			type: data.type,
			locationId: data.locationId,
			warehouseId: data.warehouseId || location.warehouseId,
			capacity: data.capacity?.toString(),
			weightLimit: data.weightLimit?.toString(),
			weightLimitUom: data.weightLimitUom,
			dimensions: data.dimensions,
			parentId: data.parentId,
		})
		.returning();

	return unit;
};

/**
 * Moves handling unit to different location and records history
 */
export const moveHandlingUnit = async (
	data: MoveHandlingUnitInput,
	organizationId: string,
) => {
	return await db.transaction(async (tx) => {
		const unit = await tx.query.handlingUnits.findFirst({
			where: and(
				eq(handlingUnits.id, data.id),
				eq(handlingUnits.organizationId, organizationId),
			),
		});

		if (!unit) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Handling unit not found",
			});
		}

		const toLocation = await tx.query.locations.findFirst({
			where: eq(locations.id, data.toLocationId),
		});

		if (!toLocation) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Destination location not found",
			});
		}

		await tx.insert(handlingUnitHistory).values({
			handlingUnitId: data.id,
			fromLocationId: unit.locationId,
			toLocationId: data.toLocationId,
			notes: data.notes,
		});

		const [updated] = await tx
			.update(handlingUnits)
			.set({
				locationId: data.toLocationId,
				warehouseId: toLocation.warehouseId,
			})
			.where(eq(handlingUnits.id, data.id))
			.returning();

		return updated;
	});
};

/**
 * Adds product content to handling unit
 */
export const addHandlingUnitContent = async (
	data: AddHandlingUnitContentInput,
	organizationId: string,
) => {
	return await db.transaction(async (tx) => {
		const unit = await tx.query.handlingUnits.findFirst({
			where: and(
				eq(handlingUnits.id, data.handlingUnitId),
				eq(handlingUnits.organizationId, organizationId),
			),
		});

		if (!unit) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Handling unit not found",
			});
		}

		const [product] = await tx
			.select({
				id: productTable.id,
				baseUom: productTable.baseUom,
				weight: productTable.weight,
				weightUom: productTable.weightUom,
			})
			.from(productTable)
			.where(eq(productTable.id, data.productId));

		if (!product) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Product not found",
			});
		}

		const qtyInBase = await convertUomToBase(
			tx,
			data.productId,
			data.quantity,
			data.uomCode,
			product.baseUom,
		);

		const currentContents = await tx
			.select()
			.from(handlingUnitContents)
			.where(eq(handlingUnitContents.handlingUnitId, data.handlingUnitId));

		if (unit.capacity) {
			const currentQty = currentContents.reduce(
				(sum, c) => sum + Number(c.qtyInUom),
				0,
			);
			const newTotalQty = currentQty + data.quantity;

			if (newTotalQty > Number(unit.capacity)) {
				throw new TRPCError({
					code: "CONFLICT",
					message: `Adding ${data.quantity} units would exceed handling unit capacity of ${unit.capacity} (current: ${currentQty})`,
				});
			}
		}

		if (
			unit.weightLimit &&
			product.weight &&
			unit.weightLimitUom &&
			product.weightUom
		) {
			let currentWeightInLimitUom = 0;

			for (const content of currentContents) {
				const contentProduct = await tx.query.product.findFirst({
					where: eq(productTable.id, content.productId),
				});

				if (contentProduct?.weight && contentProduct.weightUom) {
					const contentWeight =
						Number(content.qtyInUom) * Number(contentProduct.weight);
					const convertedWeight = await convertWeight(
						tx,
						contentWeight,
						contentProduct.weightUom,
						unit.weightLimitUom,
					);
					currentWeightInLimitUom += convertedWeight;
				}
			}

			const newProductWeight = data.quantity * Number(product.weight);
			const newWeightInLimitUom = await convertWeight(
				tx,
				newProductWeight,
				product.weightUom,
				unit.weightLimitUom,
			);

			const newTotalWeight = currentWeightInLimitUom + newWeightInLimitUom;

			if (newTotalWeight > Number(unit.weightLimit)) {
				throw new TRPCError({
					code: "CONFLICT",
					message: `Adding ${data.quantity} units would exceed handling unit weight limit of ${unit.weightLimit}${unit.weightLimitUom} (current: ${currentWeightInLimitUom.toFixed(2)}${unit.weightLimitUom})`,
				});
			}
		}

		const [content] = await tx
			.insert(handlingUnitContents)
			.values({
				handlingUnitId: data.handlingUnitId,
				productId: data.productId,
				batchId: data.batchId,
				uomCode: data.uomCode,
				qtyInBase: qtyInBase.toString(),
				qtyInUom: data.quantity.toString(),
				serialNumber: data.serialNumber,
			})
			.returning();

		return content;
	});
};

/**
 * Removes content from handling unit
 */
export const removeHandlingUnitContent = async (
	data: RemoveHandlingUnitContentInput,
	organizationId: string,
) => {
	return await db.transaction(async (tx) => {
		const content = await tx.query.handlingUnitContents.findFirst({
			where: eq(handlingUnitContents.id, data.contentId),
		});

		if (!content) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Content not found",
			});
		}

		const unit = await tx.query.handlingUnits.findFirst({
			where: and(
				eq(handlingUnits.id, content.handlingUnitId),
				eq(handlingUnits.organizationId, organizationId),
			),
		});

		if (!unit) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Handling unit not found",
			});
		}

		const currentQty = Number(content.qtyInUom);

		if (data.quantity >= currentQty) {
			await tx
				.delete(handlingUnitContents)
				.where(eq(handlingUnitContents.id, data.contentId));
		} else {
			const product = await tx.query.product.findFirst({
				where: eq(productTable.id, content.productId),
			});

			if (!product) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Product not found",
				});
			}

			const remainingQty = currentQty - data.quantity;
			const qtyInBase = await convertUomToBase(
				tx,
				content.productId,
				remainingQty,
				content.uomCode || product.baseUom,
				product.baseUom,
			);

			await tx
				.update(handlingUnitContents)
				.set({
					qtyInUom: remainingQty.toString(),
					qtyInBase: qtyInBase.toString(),
				})
				.where(eq(handlingUnitContents.id, data.contentId));
		}

		return { success: true };
	});
};

/**
 * Gets handling unit with contents
 */
export const getHandlingUnitById = async (
	id: string,
	organizationId: string,
) => {
	const unit = await db.query.handlingUnits.findFirst({
		where: and(
			eq(handlingUnits.id, id),
			eq(handlingUnits.organizationId, organizationId),
		),
		with: {
			contents: true,
			location: true,
			warehouse: true,
		},
	});

	if (!unit) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Handling unit not found",
		});
	}

	return unit;
};

/**
 * Gets handling units by location
 */
export const getHandlingUnitsByLocation = async (
	locationId: string,
	organizationId: string,
) => {
	return await db.query.handlingUnits.findMany({
		where: and(
			eq(handlingUnits.locationId, locationId),
			eq(handlingUnits.organizationId, organizationId),
		),
		with: {
			contents: true,
		},
	});
};

/**
 * Deletes handling unit if empty
 */
export const deleteHandlingUnit = async (
	id: string,
	organizationId: string,
) => {
	return await db.transaction(async (tx) => {
		const unit = await tx.query.handlingUnits.findFirst({
			where: and(
				eq(handlingUnits.id, id),
				eq(handlingUnits.organizationId, organizationId),
			),
		});

		if (!unit) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Handling unit not found",
			});
		}

		const contents = await tx
			.select()
			.from(handlingUnitContents)
			.where(eq(handlingUnitContents.handlingUnitId, id));

		if (contents.length > 0) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "Cannot delete handling unit with contents",
			});
		}

		await tx.delete(handlingUnits).where(eq(handlingUnits.id, id));

		return { success: true };
	});
};

/**
 * Creates inventory reservation
 */
export const createReservation = async (
	data: CreateReservationInput,
	organizationId: string,
) => {
	const now = new Date();

	if (data.expiresAt && data.expiresAt <= now) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Expiration date must be in the future",
		});
	}

	return await db.transaction(async (tx) => {
		// For hard reservations, validate sufficient stock
		if (data.reservationType === "hard") {
			const stock = await _getStock(
				{
					organizationId,
					productId: data.productId,
					warehouseId: data.warehouseId,
				},
				tx,
			);
			const availableStock = Number(stock?.totalQty || 0);

			if (availableStock < data.qtyInBase) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Insufficient stock for hard reservation. Available: ${availableStock}, Requested: ${data.qtyInBase}`,
				});
			}
		}

		const [reservation] = await tx
			.insert(inventoryReservations)
			.values({
				organizationId,
				reservationType: data.reservationType,
				referenceType: data.referenceType,
				referenceId: data.referenceId,
				productId: data.productId,
				warehouseId: data.warehouseId,
				batchId: data.batchId,
				handlingUnitId: data.handlingUnitId,
				qtyInBase: data.qtyInBase.toString(),
				uomCode: data.uomCode,
				expiresAt: data.expiresAt,
				notes: data.notes,
			})
			.returning();

		return reservation;
	});
};

/**
 * Releases reservation
 */
export const releaseReservation = async (
	data: ReleaseReservationInput,
	organizationId: string,
) => {
	const reservation = await db.query.inventoryReservations.findFirst({
		where: and(
			eq(inventoryReservations.id, data.id),
			eq(inventoryReservations.organizationId, organizationId),
		),
	});

	if (!reservation) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Reservation not found",
		});
	}

	if (reservation.releasedAt) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Reservation already released",
		});
	}

	const [updated] = await db
		.update(inventoryReservations)
		.set({
			releasedAt: new Date(),
			releaseReason: data.reason,
		})
		.where(eq(inventoryReservations.id, data.id))
		.returning();

	return updated;
};

/**
 * Extends reservation expiration
 */
export const extendReservation = async (
	data: ExtendReservationInput,
	organizationId: string,
) => {
	const reservation = await db.query.inventoryReservations.findFirst({
		where: and(
			eq(inventoryReservations.id, data.id),
			eq(inventoryReservations.organizationId, organizationId),
		),
	});

	if (!reservation) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Reservation not found",
		});
	}

	if (reservation.releasedAt) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Cannot extend released reservation",
		});
	}

	const [updated] = await db
		.update(inventoryReservations)
		.set({ expiresAt: data.expiresAt })
		.where(eq(inventoryReservations.id, data.id))
		.returning();

	return updated;
};

/**
 * Gets active reservations (not released and not expired)
 */
export const getActiveReservations = async (organizationId: string) => {
	const now = new Date();

	return await db.query.inventoryReservations.findMany({
		where: and(
			eq(inventoryReservations.organizationId, organizationId),
			// Not released (releasedAt is null)
			isNull(inventoryReservations.releasedAt),
			// Not expired (expiresAt is null or in the future)
			or(
				isNull(inventoryReservations.expiresAt),
				gte(inventoryReservations.expiresAt, now),
			),
		),
		with: {
			product: true,
			warehouse: true,
		},
	});
};

/**
 * Gets reservations by product
 */
export const getReservationsByProduct = async (
	productId: string,
	organizationId: string,
) => {
	return await db.query.inventoryReservations.findMany({
		where: and(
			eq(inventoryReservations.productId, productId),
			eq(inventoryReservations.organizationId, organizationId),
		),
		orderBy: (reservations, { desc }) => [desc(reservations.createdAt)],
	});
};

/**
 * Gets reservations by reference
 */
export const getReservationsByReference = async (
	referenceType: string,
	referenceId: string,
	organizationId: string,
) => {
	return await db.query.inventoryReservations.findMany({
		where: and(
			eq(inventoryReservations.referenceType, referenceType),
			eq(inventoryReservations.referenceId, referenceId),
			eq(inventoryReservations.organizationId, organizationId),
		),
	});
};
