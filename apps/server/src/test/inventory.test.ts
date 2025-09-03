import { type inferProcedureInput, TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { beforeAll, describe, expect, it } from "vitest";
import type { AppRouter } from "@/routers";
import { getProductStock } from "@/services/product";
import { globals } from "./globals";
import { setupTestContext } from "./util";

describe("Testing  Inventory", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;
	let productId: string;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	it.sequential("should receive inventory", async () => {
		const { caller, defaultOrg, defaultCategoryId } = ctx;
		const orgId = defaultOrg.id;

		const productInput: inferProcedureInput<AppRouter["product"]["create"]> = {
			organizationId: orgId,
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
			organizationId: orgId,
			warehouseId: globals.id,
			productId: createdProduct.id,
			qty: 6,
			uomCode: "PK",
			cost: 5.5,
			currency: "USD",
		};

		const createdInventory = await caller.inventory.receive(inventoryInput);

		expect(createdInventory).toMatchObject({
			success: true,
			qtyInBase: 36,
		});
	});

	it.sequential("should sell product", async () => {
		const sellInput: inferProcedureInput<AppRouter["inventory"]["sell"]> = {
			organizationId: ctx.defaultOrg.id,
			warehouseId: globals.id,
			productId: productId,
			lines: [
				{ qty: 1, uomCode: "PK" },
				{ qty: 8, uomCode: "EA" },
			],
		};

		const createdSell = await ctx.caller.inventory.sell(sellInput);

		expect(createdSell).toMatchObject({
			success: true,
		});

		const stock = await getProductStock({
			organizationId: ctx.defaultOrg.id,
			productId: productId,
			warehouseId: globals.id,
		});

		expect(stock).toMatchObject({
			totalQty: 27,
			uomCode: "EA",
		});
	});

	it.fails.sequential(
		"should fail when selling more than available",
		async () => {
			const sellInput: inferProcedureInput<AppRouter["inventory"]["sell"]> = {
				organizationId: ctx.defaultOrg.id,
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
