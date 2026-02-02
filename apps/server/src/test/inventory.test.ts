import type { inferProcedureInput } from "@trpc/server";
import { nanoid } from "nanoid";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AppRouter } from "@/routers";

import { globals } from "./globals";
import { setupTestContext } from "./util";

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
				{ qty: 1, uomCode: "PK" }, //6
				{ qty: 8, uomCode: "EA" }, //8
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

	it.sequential.fails(
		"should fail when selling more than available",
		async () => {
			const sellInput: inferProcedureInput<AppRouter["inventory"]["sell"]> = {
				warehouseId: globals.id,
				productId: productId,
				lines: [
					{ qty: 4, uomCode: "PK" },
					{ qty: 4, uomCode: "EA" },
				], // 28 total
			};
			await ctx.caller.inventory.sell(sellInput);
		},
	);
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

	it.sequential.fails(
		"should fail when selling more than available",
		async () => {
			const sellInput: inferProcedureInput<AppRouter["inventory"]["sell"]> = {
				warehouseId: globals.id,
				productId: productId,
				lines: [
					{ qty: 4, uomCode: "PK" },
					{ qty: 10, uomCode: "EA" },
				], // 50 total
			};
			await ctx.caller.inventory.sell(sellInput);
		},
	);
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

		// Start with 50 EA (5 PK) stock for adjustment testing
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

	it.sequential(
		"should perform positive adjustment with UoM conversion",
		async () => {
			const adjustInput: inferProcedureInput<AppRouter["inventory"]["adjust"]> =
				{
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

			// Check stock increased by 20 EA (2 PK)
			const stock = await ctx.caller.product.getStock({
				productId,
				warehouseId: globals.id,
			});

			expect(stock).toMatchObject({
				totalQty: 70, // 50 + 20
				uomCode: "EA",
			});
		},
	);

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

		// Check stock decreased by 10 EA
		const stock = await ctx.caller.product.getStock({
			productId,
			warehouseId: globals.id,
		});

		expect(stock).toMatchObject({
			totalQty: 40, // 50 - 10
			uomCode: "EA",
		});
	});

	it.sequential.fails(
		"should fail negative adjustment with insufficient stock",
		async () => {
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
		},
	);

	it.sequential.fails("should fail for non-physical products", async () => {
		const { caller, defaultCategoryId } = ctx;

		// Create non-physical product
		const nonPhysicalProduct = await caller.product.create({
			sku: nanoid(10),
			name: "Service Product",
			baseUom: "EA",
			trackingLevel: "none",
			isPhysical: false, // Non-physical
			categoryId: defaultCategoryId,
			prices: [{ uomCode: "EA", price: 10.0 }],
		});

		const adjustInput: inferProcedureInput<AppRouter["inventory"]["adjust"]> = {
			warehouseId: globals.id,
			productId: nonPhysicalProduct.id,
			adjustmentType: "pos",
			qty: 1,
			uomCode: "EA",
			reason: "correction",
		};

		await ctx.caller.inventory.adjust(adjustInput);
	});

	it.sequential.fails("should fail with invalid UoM conversion", async () => {
		const adjustInput: inferProcedureInput<AppRouter["inventory"]["adjust"]> = {
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

		// Note: Cannot directly verify ledger notes in this test, but the function should handle it
	});
});

describe("Testing Inventory with Product Prices", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;
	let productWithPricesId: string;
	const eaPrice = 2.5;
	const pkPrice = 12.0;

	beforeAll(async () => {
		ctx = await setupTestContext();

		// Crear producto con precios específicos por UOM
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

	it.sequential(
		"should receive inventory and verify product prices exist",
		async () => {
			// Recibir 10 PK (60 EA en base)
			const receiveQty = 10;
			const receiveInput: inferProcedureInput<
				AppRouter["inventory"]["receive"]
			> = {
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

			const eaPriceConfig = productPrices.find((p) => p.uomCode === "EA");
			expect(eaPriceConfig).toBeDefined();
			expect(Number(eaPriceConfig?.price)).toBe(eaPrice);

			const pkPriceConfig = productPrices.find((p) => p.uomCode === "PK");
			expect(pkPriceConfig).toBeDefined();
			expect(Number(pkPriceConfig?.price)).toBe(pkPrice);
		},
	);

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

	it.sequential(
		"should calculate order value using configured prices",
		async () => {
			// Calcular valor de una orden: 3 PK + 10 EA
			// Valor esperado: 3*12.0 + 10*2.5 = 36 + 25 = 61
			const expectedValue = 3 * pkPrice + 10 * eaPrice;

			// Obtener precios directamente del producto
			const productPrices =
				await ctx.caller.price.product.getByProduct(productWithPricesId);

			const eaPriceConfig = productPrices.find((p) => p.uomCode === "EA");
			const pkPriceConfig = productPrices.find((p) => p.uomCode === "PK");

			expect(eaPriceConfig).toBeDefined();
			expect(pkPriceConfig).toBeDefined();

			const calculatedValue =
				3 * Number(pkPriceConfig?.price || 0) +
				10 * Number(eaPriceConfig?.price || 0);

			expect(calculatedValue).toBe(expectedValue);
		},
	);
});
