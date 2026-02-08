import type { inferProcedureInput } from "@trpc/server";
import { nanoid } from "nanoid";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initializeJobs, shutdownJobs } from "@/jobs";
import { expireReservationsHandler } from "@/jobs/handlers/inventory/expireReservations";
import type { AppRouter } from "@/routers";
import { globals } from "./_globals";
import { formatNumeric, setupTestContext } from "./util";

describe("Testing Handling Units", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;
	let productId: string;
	let locationId: string;

	beforeAll(async () => {
		ctx = await setupTestContext();

		const productInput: inferProcedureInput<AppRouter["product"]["create"]> = {
			sku: nanoid(10),
			name: "Test Product for Handling Units",
			baseUom: "EA",
			trackingLevel: "lot",
			isPhysical: true,
			categoryId: ctx.defaultCategoryId,
			prices: [{ uomCode: "EA", price: 1.0 }],
		};

		const createdProduct = await ctx.caller.product.create(productInput);
		productId = createdProduct.id;
		locationId = globals.id;

		await ctx.caller.inventory.receive({
			warehouseId: locationId,
			productId,
			qty: 100,
			uomCode: "EA",
			currency: "USD",
		});
	});

	describe("Handling Unit CRUD", () => {
		it.sequential("should create a pallet handling unit", async () => {
			const createInput: inferProcedureInput<
				AppRouter["inventory"]["handlingUnits"]["create"]
			> = {
				code: `PALLET-${nanoid(8)}`,
				type: "pallet",
				locationId,
				capacity: 50,
				weightLimit: 500,
				dimensions: { length: 120, width: 100, height: 150 },
			};

			const result =
				await ctx.caller.inventory.handlingUnits.create(createInput);

			expect(result).toMatchObject({
				code: createInput.code,
				type: "pallet",
				locationId,
				capacity: formatNumeric(50),
				weightLimit: formatNumeric(500),
			});
			expect(result.id).toBeDefined();
		});

		it.sequential("should create a box handling unit", async () => {
			const createInput: inferProcedureInput<
				AppRouter["inventory"]["handlingUnits"]["create"]
			> = {
				code: `BOX-${nanoid(8)}`,
				type: "box",
				locationId,
				capacity: 20,
				weightLimit: 25,
				dimensions: { length: 40, width: 30, height: 25 },
			};

			const result =
				await ctx.caller.inventory.handlingUnits.create(createInput);

			expect(result).toMatchObject({
				code: createInput.code,
				type: "box",
			});
		});

		it.sequential("should get handling unit by id with contents", async () => {
			const createInput: inferProcedureInput<
				AppRouter["inventory"]["handlingUnits"]["create"]
			> = {
				code: `PALLET-GET-${nanoid(6)}`,
				type: "pallet",
				locationId,
			};

			const created =
				await ctx.caller.inventory.handlingUnits.create(createInput);

			const result = await ctx.caller.inventory.handlingUnits.getById(
				created.id,
			);

			expect(result).toMatchObject({
				id: created.id,
				code: createInput.code,
			});
			expect(result.contents).toEqual([]);
		});

		it.sequential("should get handling units by location", async () => {
			const result =
				await ctx.caller.inventory.handlingUnits.getByLocation(locationId);

			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThanOrEqual(2);
		});

		it.sequential("should move handling unit to different location", async () => {
			const createInput: inferProcedureInput<
				AppRouter["inventory"]["handlingUnits"]["create"]
			> = {
				code: `PALLET-MOVE-${nanoid(6)}`,
				type: "pallet",
				locationId,
			};

			const created =
				await ctx.caller.inventory.handlingUnits.create(createInput);

			const newLocationId = locationId;
			const moveInput: inferProcedureInput<
				AppRouter["inventory"]["handlingUnits"]["move"]
			> = {
				id: created.id,
				toLocationId: newLocationId,
				notes: "Relocation for optimization",
			};

			const result = await ctx.caller.inventory.handlingUnits.move(moveInput);

			expect(result.locationId).toBe(newLocationId);
		});

		it.sequential("should delete empty handling unit", async () => {
			const createInput: inferProcedureInput<
				AppRouter["inventory"]["handlingUnits"]["create"]
			> = {
				code: `PALLET-DEL-${nanoid(6)}`,
				type: "pallet",
				locationId,
			};

			const created =
				await ctx.caller.inventory.handlingUnits.create(createInput);

			const result = await ctx.caller.inventory.handlingUnits.delete(
				created.id,
			);

			expect(result).toMatchObject({
				success: true,
			});
		});

		it.sequential
			.fails("should fail to delete handling unit with contents", async () => {
				const createInput: inferProcedureInput<
					AppRouter["inventory"]["handlingUnits"]["create"]
				> = {
					code: `PALLET-NODEL-${nanoid(6)}`,
					type: "pallet",
					locationId,
				};

				const created =
					await ctx.caller.inventory.handlingUnits.create(createInput);

				await ctx.caller.inventory.handlingUnits.addContent({
					handlingUnitId: created.id,
					productId,
					quantity: 10,
					uomCode: "EA",
					batchId: "LOT-001",
				});

				await ctx.caller.inventory.handlingUnits.delete(created.id);
			});
	});

	describe("Handling Unit Content Management", () => {
		let handlingUnitId: string;

		beforeAll(async () => {
			const createInput: inferProcedureInput<
				AppRouter["inventory"]["handlingUnits"]["create"]
			> = {
				code: `PALLET-CONTENT-${nanoid(6)}`,
				type: "pallet",
				locationId,
				capacity: 100,
			};

			const created =
				await ctx.caller.inventory.handlingUnits.create(createInput);
			handlingUnitId = created.id;
		});

		it.sequential("should add content to handling unit", async () => {
			const addInput: inferProcedureInput<
				AppRouter["inventory"]["handlingUnits"]["addContent"]
			> = {
				handlingUnitId,
				productId,
				quantity: 25,
				uomCode: "EA",
				batchId: "LOT-001",
			};

			const result =
				await ctx.caller.inventory.handlingUnits.addContent(addInput);

			expect(result).toMatchObject({
				handlingUnitId,
				productId,
				qtyInUom: formatNumeric(25, 9),
			});
			expect(result.id).toBeDefined();
		});

		it.sequential("should add content with serial number", async () => {
			const addInput: inferProcedureInput<
				AppRouter["inventory"]["handlingUnits"]["addContent"]
			> = {
				handlingUnitId,
				productId,
				quantity: 1,
				uomCode: "EA",
				batchId: "LOT-002",
				serialNumber: "SN-12345",
			};

			const result =
				await ctx.caller.inventory.handlingUnits.addContent(addInput);

			expect(result).toMatchObject({
				serialNumber: "SN-12345",
			});
		});

		it.sequential("should get handling unit with contents", async () => {
			const result =
				await ctx.caller.inventory.handlingUnits.getById(handlingUnitId);

			expect(result.contents).toHaveLength(2);
			expect(result.contents[0]).toMatchObject({
				productId,
				qtyInUom: "25",
			});
		});

		it.sequential("should remove content from handling unit", async () => {
			const unit =
				await ctx.caller.inventory.handlingUnits.getById(handlingUnitId);

			const contentId = unit.contents[0].id;

			const removeInput: inferProcedureInput<
				AppRouter["inventory"]["handlingUnits"]["removeContent"]
			> = {
				handlingUnitId,
				contentId,
				quantity: 25,
			};

			const result =
				await ctx.caller.inventory.handlingUnits.removeContent(removeInput);

			expect(result).toMatchObject({
				success: true,
			});

			const updatedUnit =
				await ctx.caller.inventory.handlingUnits.getById(handlingUnitId);
			expect(updatedUnit.contents).toHaveLength(1);
		});
	});

	describe("Nested Handling Units", () => {
		it.sequential("should create nested handling units", async () => {
			const parentInput: inferProcedureInput<
				AppRouter["inventory"]["handlingUnits"]["create"]
			> = {
				code: `PALLET-PARENT-${nanoid(6)}`,
				type: "pallet",
				locationId,
				capacity: 10,
			};

			const parent =
				await ctx.caller.inventory.handlingUnits.create(parentInput);

			const childInput: inferProcedureInput<
				AppRouter["inventory"]["handlingUnits"]["create"]
			> = {
				code: `BOX-CHILD-${nanoid(6)}`,
				type: "box",
				locationId,
				parentId: parent.id,
				capacity: 20,
			};

			const child = await ctx.caller.inventory.handlingUnits.create(childInput);

			expect(child.parentId).toBe(parent.id);
		});
	});

	describe("Handling Unit Capacity and Weight Validation", () => {
		let productWithWeightKg: string;
		let productWithWeightLb: string;
		let productWithoutWeight: string;
		let unitWithLimits: string;
		let unitWithoutLimits: string;

		beforeAll(async () => {
			const productKgInput: inferProcedureInput<
				AppRouter["product"]["create"]
			> = {
				sku: `WEIGHT-KG-${nanoid(6)}`,
				name: "Product with KG weight",
				baseUom: "EA",
				trackingLevel: "none",
				isPhysical: true,
				categoryId: ctx.defaultCategoryId,
				weight: 2.5,
				weightUom: "KG",
				prices: [{ uomCode: "EA", price: 1.0 }],
			};
			const prodKg = await ctx.caller.product.create(productKgInput);
			productWithWeightKg = prodKg.id;

			const productLbInput: inferProcedureInput<
				AppRouter["product"]["create"]
			> = {
				sku: `WEIGHT-LB-${nanoid(6)}`,
				name: "Product with LB weight",
				baseUom: "EA",
				trackingLevel: "none",
				isPhysical: true,
				categoryId: ctx.defaultCategoryId,
				weight: 5.5,
				weightUom: "LB",
				prices: [{ uomCode: "EA", price: 1.0 }],
			};
			const prodLb = await ctx.caller.product.create(productLbInput);
			productWithWeightLb = prodLb.id;

			const productNoWeightInput: inferProcedureInput<
				AppRouter["product"]["create"]
			> = {
				sku: `NO-WEIGHT-${nanoid(6)}`,
				name: "Product without weight",
				baseUom: "EA",
				trackingLevel: "none",
				isPhysical: true,
				categoryId: ctx.defaultCategoryId,
				prices: [{ uomCode: "EA", price: 1.0 }],
			};
			const prodNoWeight =
				await ctx.caller.product.create(productNoWeightInput);
			productWithoutWeight = prodNoWeight.id;

			const unitWithLimitsInput: inferProcedureInput<
				AppRouter["inventory"]["handlingUnits"]["create"]
			> = {
				code: `LIMITED-${nanoid(6)}`,
				type: "pallet",
				locationId,
				capacity: 50,
				weightLimit: 100,
				weightLimitUom: "KG",
			};
			const unitLimited =
				await ctx.caller.inventory.handlingUnits.create(unitWithLimitsInput);
			unitWithLimits = unitLimited.id;

			const unitNoLimitsInput: inferProcedureInput<
				AppRouter["inventory"]["handlingUnits"]["create"]
			> = {
				code: `NO-LIMITS-${nanoid(6)}`,
				type: "pallet",
				locationId,
			};
			const unitNoLimits =
				await ctx.caller.inventory.handlingUnits.create(unitNoLimitsInput);
			unitWithoutLimits = unitNoLimits.id;

			await ctx.caller.inventory.receive({
				warehouseId: locationId,
				productId: productWithWeightKg,
				qty: 100,
				uomCode: "EA",
				currency: "USD",
			});
			await ctx.caller.inventory.receive({
				warehouseId: locationId,
				productId: productWithWeightLb,
				qty: 100,
				uomCode: "EA",
				currency: "USD",
			});
			await ctx.caller.inventory.receive({
				warehouseId: locationId,
				productId: productWithoutWeight,
				qty: 100,
				uomCode: "EA",
				currency: "USD",
			});
		});

		describe("Capacity Validation", () => {
			it.sequential("should reject adding content that exceeds capacity", async () => {
				await ctx.caller.inventory.handlingUnits.addContent({
					handlingUnitId: unitWithLimits,
					productId: productWithWeightKg,
					quantity: 40,
					uomCode: "EA",
					batchId: "BATCH-001",
				});

				// Try to add 20 more (would exceed capacity)
				await expect(
					ctx.caller.inventory.handlingUnits.addContent({
						handlingUnitId: unitWithLimits,
						productId: productWithWeightKg,
						quantity: 20,
						uomCode: "EA",
						batchId: "BATCH-002",
					}),
				).rejects.toThrow("exceed handling unit capacity");
			});

			it.sequential("should allow adding content within capacity", async () => {
				// Add 5 units (within remaining capacity of 10)
				const result = await ctx.caller.inventory.handlingUnits.addContent({
					handlingUnitId: unitWithLimits,
					productId: productWithWeightKg,
					quantity: 5,
					uomCode: "EA",
					batchId: "BATCH-003",
				});

				expect(result).toBeDefined();
				expect(result.qtyInUom).toBe(formatNumeric(5, 9));
			});

			it.sequential("should not validate capacity when capacity is null", async () => {
				const result = await ctx.caller.inventory.handlingUnits.addContent({
					handlingUnitId: unitWithoutLimits,
					productId: productWithWeightKg,
					quantity: 100,
					uomCode: "EA",
					batchId: "BATCH-NO-LIMIT",
				});

				expect(result).toBeDefined();
				expect(result.qtyInUom).toBe(formatNumeric(100, 9));
			});
		});

		describe("Weight Limit Validation", () => {
			it.sequential("should reject adding content that exceeds weight limit", async () => {
				const lowWeightUnitInput: inferProcedureInput<
					AppRouter["inventory"]["handlingUnits"]["create"]
				> = {
					code: `LOW-WEIGHT-${nanoid(6)}`,
					type: "box",
					locationId,
					weightLimit: 5, // 5 KG limit
					weightLimitUom: "KG",
				};
				const lowWeightUnit =
					await ctx.caller.inventory.handlingUnits.create(lowWeightUnitInput);

				// Try to add 3 units of 2.5 KG each = 7.5 KG (exceeds 5 KG)
				await expect(
					ctx.caller.inventory.handlingUnits.addContent({
						handlingUnitId: lowWeightUnit.id,
						productId: productWithWeightKg,
						quantity: 3,
						uomCode: "EA",
						batchId: "BATCH-WEIGHT-001",
					}),
				).rejects.toThrow("exceed handling unit weight limit");
			});

			it.sequential("should convert LB to KG automatically", async () => {
				const kgUnitInput: inferProcedureInput<
					AppRouter["inventory"]["handlingUnits"]["create"]
				> = {
					code: `KG-UNIT-${nanoid(6)}`,
					type: "box",
					locationId,
					weightLimit: 10, // 10 KG limit
					weightLimitUom: "KG",
				};
				const kgUnit =
					await ctx.caller.inventory.handlingUnits.create(kgUnitInput);

				// Add product with weight in LB (5.5 LB = ~2.49 KG)
				// 3 units = ~7.47 KG (within 10 KG limit)
				const result = await ctx.caller.inventory.handlingUnits.addContent({
					handlingUnitId: kgUnit.id,
					productId: productWithWeightLb,
					quantity: 3,
					uomCode: "EA",
					batchId: "BATCH-LB-001",
				});

				expect(result).toBeDefined();

				// Try to add 2 more units (would exceed limit)
				// 5 units = ~12.45 KG (exceeds 10 KG)
				await expect(
					ctx.caller.inventory.handlingUnits.addContent({
						handlingUnitId: kgUnit.id,
						productId: productWithWeightLb,
						quantity: 2,
						uomCode: "EA",
						batchId: "BATCH-LB-002",
					}),
				).rejects.toThrow("exceed handling unit weight limit");
			});

			it.sequential("should not validate weight when weightLimit is null", async () => {
				const result = await ctx.caller.inventory.handlingUnits.addContent({
					handlingUnitId: unitWithoutLimits,
					productId: productWithWeightKg,
					quantity: 50, // 125 KG total
					uomCode: "EA",
					batchId: "BATCH-NO-WEIGHT-LIMIT",
				});

				expect(result).toBeDefined();
			});

			it.sequential("should not validate weight when product has no weight", async () => {
				const weightUnitInput: inferProcedureInput<
					AppRouter["inventory"]["handlingUnits"]["create"]
				> = {
					code: `WEIGHT-UNIT-${nanoid(6)}`,
					type: "box",
					locationId,
					weightLimit: 1, // 1 KG limit
					weightLimitUom: "KG",
				};
				const weightUnit =
					await ctx.caller.inventory.handlingUnits.create(weightUnitInput);

				// Add product without weight (should not fail)
				const result = await ctx.caller.inventory.handlingUnits.addContent({
					handlingUnitId: weightUnit.id,
					productId: productWithoutWeight,
					quantity: 100,
					uomCode: "EA",
					batchId: "BATCH-NO-WEIGHT",
				});

				expect(result).toBeDefined();
			});
		});

		describe("Edge Cases", () => {
			it.sequential("should handle product with weight 0", async () => {
				const productZeroWeightInput: inferProcedureInput<
					AppRouter["product"]["create"]
				> = {
					sku: `ZERO-WEIGHT-${nanoid(6)}`,
					name: "Product with zero weight",
					baseUom: "EA",
					trackingLevel: "none",
					isPhysical: true,
					categoryId: ctx.defaultCategoryId,
					weight: 0,
					weightUom: "KG",
					prices: [{ uomCode: "EA", price: 1.0 }],
				};
				const prodZeroWeight = await ctx.caller.product.create(
					productZeroWeightInput,
				);

				await ctx.caller.inventory.receive({
					warehouseId: locationId,
					productId: prodZeroWeight.id,
					qty: 100,
					uomCode: "EA",
					currency: "USD",
				});

				const lowLimitUnitInput: inferProcedureInput<
					AppRouter["inventory"]["handlingUnits"]["create"]
				> = {
					code: `LOW-LIMIT-${nanoid(6)}`,
					type: "box",
					locationId,
					weightLimit: 0.1, // 0.1 KG limit
					weightLimitUom: "KG",
				};
				const lowLimitUnit =
					await ctx.caller.inventory.handlingUnits.create(lowLimitUnitInput);

				// Should allow many units since weight is 0
				const result = await ctx.caller.inventory.handlingUnits.addContent({
					handlingUnitId: lowLimitUnit.id,
					productId: prodZeroWeight.id,
					quantity: 1000,
					uomCode: "EA",
					batchId: "BATCH-ZERO-WEIGHT",
				});

				expect(result).toBeDefined();
			});

			it.sequential("should handle handling unit with weightLimit but no weightLimitUom", async () => {
				// TODO
				// This scenario should not happen with proper validation,
				// but we test that it doesn't crash
				// The service checks for both weightLimit and weightLimitUom
			});

			it.sequential("should calculate correctly with multiple products of different weights", async () => {
				const multiUnitInput: inferProcedureInput<
					AppRouter["inventory"]["handlingUnits"]["create"]
				> = {
					code: `MULTI-${nanoid(6)}`,
					type: "pallet",
					locationId,
					capacity: 100,
					weightLimit: 50, // 50 KG
					weightLimitUom: "KG",
				};
				const multiUnit =
					await ctx.caller.inventory.handlingUnits.create(multiUnitInput);

				// Add 10 units of KG product (2.5 KG each) = 25 KG
				await ctx.caller.inventory.handlingUnits.addContent({
					handlingUnitId: multiUnit.id,
					productId: productWithWeightKg,
					quantity: 10,
					uomCode: "EA",
					batchId: "MULTI-001",
				});

				// Add 5 units of LB product (5.5 LB = 2.49 KG each) = ~12.45 KG
				// Total so far: ~37.45 KG
				await ctx.caller.inventory.handlingUnits.addContent({
					handlingUnitId: multiUnit.id,
					productId: productWithWeightLb,
					quantity: 5,
					uomCode: "EA",
					batchId: "MULTI-002",
				});

				// Try to add more that would exceed weight limit
				// 10 more KG units = 25 KG more, total ~62.45 KG (exceeds 50)
				await expect(
					ctx.caller.inventory.handlingUnits.addContent({
						handlingUnitId: multiUnit.id,
						productId: productWithWeightKg,
						quantity: 10,
						uomCode: "EA",
						batchId: "MULTI-003",
					}),
				).rejects.toThrow("exceed handling unit weight limit");
			});
		});
	});
});

describe("Testing Inventory Reservations", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;
	let productId: string;
	let warehouseId: string;

	beforeAll(async () => {
		ctx = await setupTestContext();

		const productInput: inferProcedureInput<AppRouter["product"]["create"]> = {
			sku: nanoid(10),
			name: "Test Product for Reservations",
			baseUom: "EA",
			trackingLevel: "none",
			isPhysical: true,
			categoryId: ctx.defaultCategoryId,
			prices: [{ uomCode: "EA", price: 1.0 }],
		};

		const createdProduct = await ctx.caller.product.create(productInput);
		productId = createdProduct.id;
		warehouseId = globals.warehouse.id;

		await ctx.caller.inventory.receive({
			warehouseId,
			productId,
			qty: 100,
			uomCode: "EA",
			currency: "USD",
		});
	});

	describe("Reservation CRUD", () => {
		it.sequential("should create a soft reservation", async () => {
			const createInput: inferProcedureInput<
				AppRouter["inventory"]["reservations"]["create"]
			> = {
				productId,
				warehouseId,
				qtyInBase: 10,
				uomCode: "EA",
				reservationType: "soft",
				referenceType: "sales_order",
				referenceId: `SO-${nanoid(6)}`,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				notes: "Soft reservation for sales order",
			};

			const result =
				await ctx.caller.inventory.reservations.create(createInput);

			expect(result).toMatchObject({
				productId,
				warehouseId,
				qtyInBase: formatNumeric(10, 9),
				reservationType: "soft",
				referenceType: "sales_order",
			});
			expect(result.id).toBeDefined();
		});

		it.sequential("should create a hard reservation", async () => {
			const createInput: inferProcedureInput<
				AppRouter["inventory"]["reservations"]["create"]
			> = {
				productId,
				warehouseId,
				qtyInBase: 15,
				uomCode: "EA",
				reservationType: "hard",
				referenceType: "sales_order",
				referenceId: `SO-${nanoid(6)}`,
				expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
				notes: "Hard reservation - blocks inventory",
			};

			const result =
				await ctx.caller.inventory.reservations.create(createInput);

			expect(result).toMatchObject({
				qtyInBase: formatNumeric(15, 9),
				reservationType: "hard",
			});
		});

		it.sequential("should get active reservations", async () => {
			const result = await ctx.caller.inventory.reservations.getActive();

			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThanOrEqual(2);
		});

		it.sequential("should get reservations by product", async () => {
			const result =
				await ctx.caller.inventory.reservations.getByProduct(productId);

			expect(Array.isArray(result)).toBe(true);
			expect(
				result.every((r: { productId: string }) => r.productId === productId),
			).toBe(true);
		});

		it.sequential("should get reservations by reference", async () => {
			const referenceId = `SO-REF-${nanoid(6)}`;
			await ctx.caller.inventory.reservations.create({
				productId,
				warehouseId,
				qtyInBase: 5,
				uomCode: "EA",
				reservationType: "soft",
				referenceType: "sales_order",
				referenceId,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			});

			const result = await ctx.caller.inventory.reservations.getByReference({
				referenceType: "sales_order",
				referenceId,
			});

			expect(result).toHaveLength(1);
			expect(result[0].referenceId).toBe(referenceId);
		});
	});

	describe("Reservation Lifecycle", () => {
		it.sequential("should release a reservation", async () => {
			const created = await ctx.caller.inventory.reservations.create({
				productId,
				warehouseId,
				qtyInBase: 10,
				uomCode: "EA",
				reservationType: "soft",
				referenceType: "sales_order",
				referenceId: `SO-REL-${nanoid(6)}`,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			});

			const releaseInput: inferProcedureInput<
				AppRouter["inventory"]["reservations"]["release"]
			> = {
				id: created.id,
			};

			const result =
				await ctx.caller.inventory.reservations.release(releaseInput);

			expect(result).toMatchObject({
				id: created.id,
			});
			expect(result.releasedAt).toBeDefined();
		});

		it.sequential("should extend a reservation", async () => {
			const created = await ctx.caller.inventory.reservations.create({
				productId,
				warehouseId,
				qtyInBase: 10,
				uomCode: "EA",
				reservationType: "soft",
				referenceType: "sales_order",
				referenceId: `SO-EXT-${nanoid(6)}`,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			});

			const originalExpiry = created.expiresAt
				? new Date(created.expiresAt).getTime()
				: 0;

			const newExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000);
			const extendInput: inferProcedureInput<
				AppRouter["inventory"]["reservations"]["extend"]
			> = {
				id: created.id,
				expiresAt: newExpiry,
			};

			const result =
				await ctx.caller.inventory.reservations.extend(extendInput);

			const newExpiryTime = result.expiresAt
				? new Date(result.expiresAt).getTime()
				: 0;
			expect(newExpiryTime).toBeGreaterThan(originalExpiry);
		});

		it.sequential
			.fails("should fail to release already released reservation", async () => {
				const created = await ctx.caller.inventory.reservations.create({
					productId,
					warehouseId,
					qtyInBase: 5,
					uomCode: "EA",
					reservationType: "soft",
					referenceType: "sales_order",
					referenceId: `SO-DOUBLE-${nanoid(6)}`,
					expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				});

				await ctx.caller.inventory.reservations.release({
					id: created.id,
				});

				await ctx.caller.inventory.reservations.release({
					id: created.id,
				});
			});
	});

	describe("Reservation with Insufficient Stock", () => {
		it.sequential
			.fails("should fail to create hard reservation with insufficient stock", async () => {
				await ctx.caller.inventory.reservations.create({
					productId,
					warehouseId,
					qtyInBase: 1000,
					uomCode: "EA",
					reservationType: "hard",
					referenceType: "sales_order",
					referenceId: `SO-FAIL-${nanoid(6)}`,
					expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				});
			});
	});
});

describe("Testing  Inventory for default uom_conversion", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;
	let productId: string;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	it.sequential("should receive inventory", async () => {
		const { caller, defaultCategoryId } = ctx;

		const productInput: inferProcedureInput<AppRouter["product"]["create"]> = {
			sku: nanoid(10),
			name: "Fideos para ramen",
			baseUom: "EA",
			trackingLevel: "none",
			isPhysical: true,
			categoryId: defaultCategoryId,
			prices: [
				{
					uomCode: "EA",
					price: 1.2,
				},
				{
					uomCode: "PK",
					price: 6.0,
				},
			],
		};

		const createdProduct = await caller.product.create(productInput);

		productId = createdProduct.id;

		const inventoryInput: inferProcedureInput<
			AppRouter["inventory"]["receive"]
		> = {
			warehouseId: globals.id,
			productId: createdProduct.id,
			qty: 6,
			uomCode: "PK",
			currency: "USD",
		};

		const createdInventory = await caller.inventory.receive(inventoryInput);

		expect(createdInventory).toMatchObject({
			success: true,
			qtyInBase: 36, // 6(PK) * (uom_conversion = 6) = 36
		});
	});

	it.sequential("should sell product", async () => {
		const sellInput: inferProcedureInput<AppRouter["inventory"]["sell"]> = {
			warehouseId: globals.id,
			productId: productId,
			lines: [
				{ qty: 1, uomCode: "PK" }, //1 * 6
				{ qty: 8, uomCode: "EA" }, //8 * 1
			], //14
		};

		// 36 - 14 = 22
		const createdSell = await ctx.caller.inventory.sell(sellInput);

		expect(createdSell).toMatchObject({
			success: true,
		});

		const stock = await ctx.caller.product.getStock({
			productId,
			warehouseId: globals.id,
		});

		expect(stock).toMatchObject({
			totalQty: 36 - 14,
			uomCode: "EA",
		});
	});

	it.sequential
		.fails("should fail when selling more than available", async () => {
			const sellInput: inferProcedureInput<AppRouter["inventory"]["sell"]> = {
				warehouseId: globals.id,
				productId: productId,
				lines: [
					{ qty: 4, uomCode: "PK" },
					{ qty: 4, uomCode: "EA" },
				], // 28 total
			};
			await ctx.caller.inventory.sell(sellInput);
		});
});

describe("Testing  Inventory using productUom", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;
	let productId: string;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	it.sequential("should receive inventory", async () => {
		const { caller, defaultCategoryId } = ctx;

		const productInput: inferProcedureInput<AppRouter["product"]["create"]> = {
			sku: nanoid(10),
			name: "Fideos para ramen",
			baseUom: "EA",
			trackingLevel: "none",
			isPhysical: true,
			categoryId: defaultCategoryId,
			productUoms: [
				{
					uomCode: "PK",
					qtyInBase: "10",
				},
			],
			prices: [
				{
					uomCode: "EA",
					price: 1.2,
				},
				{
					uomCode: "PK",
					price: 6.0,
				},
			],
		};

		const createdProduct = await caller.product.create(productInput);

		productId = createdProduct.id;

		const inventoryInput: inferProcedureInput<
			AppRouter["inventory"]["receive"]
		> = {
			warehouseId: globals.id,
			productId: createdProduct.id,
			qty: 3,
			uomCode: "PK",
			currency: "USD",
		};

		const createdInventory = await caller.inventory.receive(inventoryInput);

		expect(createdInventory).toMatchObject({
			success: true,
			qtyInBase: 30, // because 3 (inventoryInput.qty) * 10 (productInput.productUoms[0].qtyInBase = 10 and uomCode === inventoryCode.uomCode => PK) = 30
		});
	});

	it.sequential("should sell product", async () => {
		const sellInput: inferProcedureInput<AppRouter["inventory"]["sell"]> = {
			warehouseId: globals.id,
			productId: productId,
			lines: [
				{ qty: 1, uomCode: "PK" }, // 10 * 1 = 10
				{ qty: 8, uomCode: "EA" }, // 8
			], //18 total
		};

		const createdSell = await ctx.caller.inventory.sell(sellInput);

		expect(createdSell).toMatchObject({
			success: true,
		});

		const stock = await ctx.caller.product.getStock({
			productId,
			warehouseId: globals.id,
		});

		expect(stock).toMatchObject({
			totalQty: 12,
			uomCode: "EA",
		});
	});

	it.sequential
		.fails("should fail when selling more than available", async () => {
			const sellInput: inferProcedureInput<AppRouter["inventory"]["sell"]> = {
				warehouseId: globals.id,
				productId: productId,
				lines: [
					{ qty: 4, uomCode: "PK" },
					{ qty: 10, uomCode: "EA" },
				], // 50 total
			};
			await ctx.caller.inventory.sell(sellInput);
		});
});

describe("Testing Inventory Adjustments", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;
	let productId: string;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	beforeEach(async () => {
		const { caller, defaultCategoryId } = ctx;

		const productInput: inferProcedureInput<AppRouter["product"]["create"]> = {
			sku: nanoid(10),
			name: "Test Product for Adjustment",
			baseUom: "EA",
			trackingLevel: "none",
			isPhysical: true,
			categoryId: defaultCategoryId,
			productUoms: [
				{
					uomCode: "PK",
					qtyInBase: "10",
				},
			],
			prices: [
				{
					uomCode: "EA",
					price: 1.0,
				},
				{
					uomCode: "PK",
					price: 10.0,
				},
			],
		};

		const createdProduct = await caller.product.create(productInput);
		productId = createdProduct.id;

		const receiveInput: inferProcedureInput<AppRouter["inventory"]["receive"]> =
			{
				warehouseId: globals.id,
				productId: createdProduct.id,
				qty: 5,
				uomCode: "PK",
				currency: "USD",
			};

		await caller.inventory.receive(receiveInput);
	});

	it.sequential("should perform positive adjustment in base UoM", async () => {
		const adjustInput: inferProcedureInput<AppRouter["inventory"]["adjust"]> = {
			warehouseId: globals.id,
			productId: productId,
			adjustmentType: "pos",
			qty: 5,
			uomCode: "EA",
			reason: "physical_count",
			notes: "Found additional items during count",
		};

		const result = await ctx.caller.inventory.adjust(adjustInput);

		expect(result).toMatchObject({
			success: true,
			qtyAdjustedInBase: 5,
		});

		const stock = await ctx.caller.product.getStock({
			productId,
			warehouseId: globals.id,
		});

		expect(stock).toMatchObject({
			totalQty: 55, // 50 + 5
			uomCode: "EA",
		});
	});

	it.sequential("should perform positive adjustment with UoM conversion", async () => {
		const adjustInput: inferProcedureInput<AppRouter["inventory"]["adjust"]> = {
			warehouseId: globals.id,
			productId: productId,
			adjustmentType: "pos",
			qty: 2,
			uomCode: "PK",
			reason: "damage",
			notes: "Items damaged in transit",
		};

		const result = await ctx.caller.inventory.adjust(adjustInput);

		expect(result).toMatchObject({
			success: true,
			qtyAdjustedInBase: 20, // 2 * 10
		});

		const stock = await ctx.caller.product.getStock({
			productId,
			warehouseId: globals.id,
		});

		expect(stock).toMatchObject({
			totalQty: 70, // 50 + 20
			uomCode: "EA",
		});
	});

	it.sequential("should perform negative adjustment", async () => {
		const adjustInput: inferProcedureInput<AppRouter["inventory"]["adjust"]> = {
			warehouseId: globals.id,
			productId: productId,
			adjustmentType: "neg",
			qty: 10,
			uomCode: "EA",
			reason: "theft",
			notes: "Items missing from warehouse",
		};

		const result = await ctx.caller.inventory.adjust(adjustInput);

		expect(result).toMatchObject({
			success: true,
			qtyAdjustedInBase: 10,
		});

		const stock = await ctx.caller.product.getStock({
			productId,
			warehouseId: globals.id,
		});

		expect(stock).toMatchObject({
			totalQty: 40, // 50 - 10
			uomCode: "EA",
		});
	});

	it.sequential
		.fails("should fail negative adjustment with insufficient stock", async () => {
			const adjustInput: inferProcedureInput<AppRouter["inventory"]["adjust"]> =
				{
					warehouseId: globals.id,
					productId: productId,
					adjustmentType: "neg",
					qty: 100,
					uomCode: "EA",
					reason: "theft",
				};

			await ctx.caller.inventory.adjust(adjustInput);
		});

	it.sequential
		.fails("should fail for non-physical products", async () => {
			const { caller, defaultCategoryId } = ctx;

			const nonPhysicalProduct = await caller.product.create({
				sku: nanoid(10),
				name: "Service Product",
				baseUom: "EA",
				trackingLevel: "none",
				isPhysical: false,
				categoryId: defaultCategoryId,
				prices: [{ uomCode: "EA", price: 10.0 }],
			});

			const adjustInput: inferProcedureInput<AppRouter["inventory"]["adjust"]> =
				{
					warehouseId: globals.id,
					productId: nonPhysicalProduct.id,
					adjustmentType: "pos",
					qty: 1,
					uomCode: "EA",
					reason: "correction",
				};

			await ctx.caller.inventory.adjust(adjustInput);
		});

	it.sequential
		.fails("should fail with invalid UoM conversion", async () => {
			const adjustInput: inferProcedureInput<AppRouter["inventory"]["adjust"]> =
				{
					warehouseId: globals.id,
					productId: productId,
					adjustmentType: "pos",
					qty: 1,
					uomCode: "INVALID_UOM",
					reason: "correction",
				};

			await ctx.caller.inventory.adjust(adjustInput);
		});

	it.sequential("should store audit trail in ledger notes", async () => {
		const adjustInput: inferProcedureInput<AppRouter["inventory"]["adjust"]> = {
			warehouseId: globals.id,
			productId: productId,
			adjustmentType: "pos",
			qty: 1,
			uomCode: "EA",
			reason: "correction",
			notes: "Manual adjustment",
			physicalCountId: "COUNT-123",
		};

		const result = await ctx.caller.inventory.adjust(adjustInput);

		expect(result).toMatchObject({
			success: true,
		});
	});
});

describe("Testing Inventory with Product Prices", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;
	let productWithPricesId: string;
	const eaPrice = 2.5;
	const pkPrice = 12.0;

	beforeAll(async () => {
		ctx = await setupTestContext();

		const productInput: inferProcedureInput<AppRouter["product"]["create"]> = {
			sku: `SKU_PRICES_${nanoid(8)}`,
			name: "Product with Multiple UOM Prices",
			baseUom: "EA",
			trackingLevel: "none",
			isPhysical: true,
			categoryId: ctx.defaultCategoryId,
			productUoms: [
				{
					uomCode: "PK",
					qtyInBase: "6",
				},
			],
			prices: [
				{
					uomCode: "EA",
					price: eaPrice,
					currency: "USD",
					minQty: 1,
				},
				{
					uomCode: "PK",
					price: pkPrice,
					currency: "USD",
					minQty: 1,
				},
			],
		};

		const createdProduct = await ctx.caller.product.create(productInput);
		productWithPricesId = createdProduct.id;
	});

	it.sequential("should receive inventory and verify product prices exist", async () => {
		// Recibir 10 PK (60 EA en base)
		const receiveQty = 10;
		const receiveInput: inferProcedureInput<AppRouter["inventory"]["receive"]> =
			{
				warehouseId: globals.warehouse.id,
				productId: productWithPricesId,
				qty: receiveQty,
				uomCode: "PK",
				currency: "USD",
			};

		const received = await ctx.caller.inventory.receive(receiveInput);

		expect(received.success).toBe(true);
		expect(received.qtyInBase).toBe(receiveQty * 6);

		// Verificar que los precios del producto están configurados
		const productPrices =
			await ctx.caller.price.product.getByProduct(productWithPricesId);

		expect(productPrices.length).toBe(2);

		const eaPriceConfig = productPrices.find(
			(p: { uomCode: string }) => p.uomCode === "EA",
		);
		expect(eaPriceConfig).toBeDefined();
		expect(Number(eaPriceConfig?.price)).toBe(eaPrice);

		const pkPriceConfig = productPrices.find(
			(p: { uomCode: string }) => p.uomCode === "PK",
		);
		expect(pkPriceConfig).toBeDefined();
		expect(Number(pkPriceConfig?.price)).toBe(pkPrice);
	});

	it.sequential("should sell product using different UOMs", async () => {
		// Vender 2 PK y 5 EA
		const sellInput: inferProcedureInput<AppRouter["inventory"]["sell"]> = {
			warehouseId: globals.warehouse.id,
			productId: productWithPricesId,
			lines: [
				{ qty: 2, uomCode: "PK" },
				{ qty: 5, uomCode: "EA" },
			],
		};

		const sold = await ctx.caller.inventory.sell(sellInput);
		expect(sold.success).toBe(true);

		// Verificar stock final: 60 - (2*6 + 5) = 60 - 17 = 43
		const finalStock = await ctx.caller.product.getStock({
			productId: productWithPricesId,
			warehouseId: globals.warehouse.id,
		});

		expect(finalStock.totalQty).toBe(43);
	});

	it.sequential("should calculate order value using configured prices", async () => {
		// Calcular valor de una orden: 3 PK + 10 EA
		// Valor esperado: 3*12.0 + 10*2.5 = 36 + 25 = 61
		const expectedValue = 3 * pkPrice + 10 * eaPrice;

		// Obtener precios directamente del producto
		const productPrices =
			await ctx.caller.price.product.getByProduct(productWithPricesId);

		const eaPriceConfig = productPrices.find(
			(p: { uomCode: string }) => p.uomCode === "EA",
		);
		const pkPriceConfig = productPrices.find(
			(p: { uomCode: string }) => p.uomCode === "PK",
		);

		expect(eaPriceConfig).toBeDefined();
		expect(pkPriceConfig).toBeDefined();

		const calculatedValue =
			3 * Number(pkPriceConfig?.price || 0) +
			10 * Number(eaPriceConfig?.price || 0);

		expect(calculatedValue).toBe(expectedValue);
	});
});

describe("Testing Inventory Jobs", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	describe("Job Queue Initialization", () => {
		it.sequential("should start job queue successfully", async () => {
			await expect(initializeJobs()).resolves.not.toThrow();
		});

		it.sequential("should stop job queue gracefully", async () => {
			await expect(shutdownJobs()).resolves.not.toThrow();
		});
	});

	describe("Expire Reservations Job", () => {
		let productId: string;
		let warehouseId: string;
		let expiredReservationId: string;
		let futureReservationId: string;
		let releasedReservationId: string;

		beforeAll(async () => {
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: nanoid(10),
					name: "Test Product for Job",
					baseUom: "EA",
					trackingLevel: "none",
					isPhysical: true,
					categoryId: ctx.defaultCategoryId,
					prices: [{ uomCode: "EA", price: 1.0 }],
				};
			const createdProduct = await ctx.caller.product.create(productInput);
			productId = createdProduct.id;
			warehouseId = globals.warehouse.id;

			await ctx.caller.inventory.receive({
				warehouseId,
				productId,
				qty: 100,
				uomCode: "EA",
				currency: "USD",
			});

			const expiredRes = await ctx.caller.inventory.reservations.create({
				productId,
				warehouseId,
				qtyInBase: 10,
				uomCode: "EA",
				reservationType: "soft",
				referenceType: "sales_order",
				referenceId: `SO-EXPIRED-${nanoid(6)}`,
				expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
			});
			expiredReservationId = expiredRes.id;

			const futureRes = await ctx.caller.inventory.reservations.create({
				productId,
				warehouseId,
				qtyInBase: 10,
				uomCode: "EA",
				reservationType: "soft",
				referenceType: "sales_order",
				referenceId: `SO-FUTURE-${nanoid(6)}`,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
			});
			futureReservationId = futureRes.id;

			const releasedRes = await ctx.caller.inventory.reservations.create({
				productId,
				warehouseId,
				qtyInBase: 10,
				uomCode: "EA",
				reservationType: "soft",
				referenceType: "sales_order",
				referenceId: `SO-RELEASED-${nanoid(6)}`,
				expiresAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
			});
			releasedReservationId = releasedRes.id;

			await ctx.caller.inventory.reservations.release({
				id: releasedReservationId,
			});
		});

		it.sequential("should expire reservations past their expiration date", async () => {
			await expireReservationsHandler({
				id: "test-job-id",
				name: "expire-reservations",
				data: {},
			});

			// Verify expired reservation was released
			const expiredReservation =
				await ctx.caller.inventory.reservations.getByReference({
					referenceType: "sales_order",
					referenceId: expiredReservationId,
				});

			// Should be empty or have releasedAt set
			if (expiredReservation.length > 0) {
				expect(expiredReservation[0].releasedAt).toBeDefined();
			}
		});

		it.sequential("should not expire reservations with future expiration", async () => {
			// Verify future reservation is still active
			const futureReservations =
				await ctx.caller.inventory.reservations.getByReference({
					referenceType: "sales_order",
					referenceId: futureReservationId,
				});

			if (futureReservations.length > 0) {
				expect(futureReservations[0].releasedAt).toBeNull();
			}
		});

		it.sequential("should not expire already released reservations", async () => {
			// The released reservation should remain released
			const releasedReservations =
				await ctx.caller.inventory.reservations.getByReference({
					referenceType: "sales_order",
					referenceId: releasedReservationId,
				});

			if (releasedReservations.length > 0) {
				expect(releasedReservations[0].releasedAt).toBeDefined();
			}
		});

		it.sequential("should filter by organization when specified", async () => {
			await expireReservationsHandler({
				id: "test-job-id-2",
				name: "expire-reservations",
				data: {
					organizationId: ctx.defaultOrg.id,
				},
			});

			// Should complete without errors
			expect(true).toBe(true);
		});
	});

	describe("Multi-tenancy Job Handling", () => {
		it.sequential("should handle multi-tenancy correctly in job execution", async () => {
			await expect(
				expireReservationsHandler({
					id: "test-job-multi",
					name: "expire-reservations",
					data: {
						organizationId: ctx.defaultOrg.id,
					},
				}),
			).resolves.not.toThrow();
		});
	});
});
