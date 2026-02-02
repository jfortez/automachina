import type { inferProcedureInput } from "@trpc/server";
import { nanoid } from "nanoid";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AppRouter } from "@/routers";
import { formatNumeric, setupTestContext } from "./util";

describe("Testing Price Route", () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	describe("Price List Management", () => {
		it("should get all price lists", async () => {
			const priceLists = await ctx.caller.price.list.getAll();
			expect(priceLists).toBeDefined();
			expect(Array.isArray(priceLists)).toBe(true);
		});

		it("should create a price list", async () => {
			const input: inferProcedureInput<AppRouter["price"]["list"]["create"]> = {
				code: `PL_${nanoid(5)}`,
				name: "Test Price List",
				type: "public",
				currency: "USD",
				attributes: {},
			};

			const created = await ctx.caller.price.list.create(input);
			expect(created).toBeDefined();
			expect(created.code).toBe(input.code);
			expect(created.name).toBe(input.name);
			expect(created.type).toBe("public");
		});

		it("should get price list by id", async () => {
			const input: inferProcedureInput<AppRouter["price"]["list"]["create"]> = {
				code: `PL_GET_${nanoid(5)}`,
				name: "Price List for Get Test",
				type: "customer",
				currency: "USD",
			};

			const created = await ctx.caller.price.list.create(input);
			const retrieved = await ctx.caller.price.list.getById(created.id);

			expect(retrieved).toBeDefined();
			expect(retrieved?.id).toBe(created.id);
			expect(retrieved?.code).toBe(input.code);
		});

		it("should get price list by code", async () => {
			const code = `PL_CODE_${nanoid(5)}`;
			const input: inferProcedureInput<AppRouter["price"]["list"]["create"]> = {
				code,
				name: "Price List for Code Test",
				type: "promotional",
				currency: "USD",
			};

			await ctx.caller.price.list.create(input);
			const retrieved = await ctx.caller.price.list.getByCode(code);

			expect(retrieved).toBeDefined();
			expect(retrieved?.code).toBe(code);
		});

		it("should update a price list", async () => {
			const input: inferProcedureInput<AppRouter["price"]["list"]["create"]> = {
				code: `PL_UPDATE_${nanoid(5)}`,
				name: "Original Name",
				type: "internal",
				currency: "USD",
			};

			const created = await ctx.caller.price.list.create(input);
			const updated = await ctx.caller.price.list.update({
				id: created.id,
				name: "Updated Name",
			});

			expect(updated).toBeDefined();
			expect(updated.name).toBe("Updated Name");
			expect(updated.code).toBe(input.code);
		});

		it("should delete a price list", async () => {
			const input: inferProcedureInput<AppRouter["price"]["list"]["create"]> = {
				code: `PL_DELETE_${nanoid(5)}`,
				name: "Price List to Delete",
				type: "public",
				currency: "USD",
			};

			const created = await ctx.caller.price.list.create(input);
			await ctx.caller.price.list.delete(created.id);

			const retrieved = await ctx.caller.price.list.getById(created.id);
			expect(retrieved).toBeUndefined();
		});
	});

	describe("Product Price Management via Product Creation", () => {
		let testProductId: string;
		const eaPrice = 99.99;
		const pkPrice = 549.99;

		beforeAll(async () => {
			// Crear producto con precios incluidos directamente
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `SKU_PRICE_${nanoid(8)}`,
					name: "Product with Prices via Creation",
					baseUom: "EA",
					categoryId: ctx.defaultCategoryId,
					trackingLevel: "none",
					isPhysical: true,
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
			const product = await ctx.caller.product.create(productInput);
			testProductId = product.id;
		});

		it.sequential("should verify product was created with prices", async () => {
			const prices = await ctx.caller.price.product.getByProduct(testProductId);

			expect(prices).toBeDefined();
			expect(Array.isArray(prices)).toBe(true);
			expect(prices.length).toBe(2);

			const eaPriceConfig = prices.find((p) => p.uomCode === "EA");
			expect(eaPriceConfig).toBeDefined();
			expect(Number(eaPriceConfig?.price)).toBe(eaPrice);

			const pkPriceConfig = prices.find((p) => p.uomCode === "PK");
			expect(pkPriceConfig).toBeDefined();
			expect(Number(pkPriceConfig?.price)).toBe(pkPrice);
		});

		it.sequential("should update a product price", async () => {
			const prices = await ctx.caller.price.product.getByProduct(testProductId);
			const priceToUpdate = prices.find((p) => p.uomCode === "EA");

			expect(priceToUpdate).toBeDefined();

			const updated = await ctx.caller.price.product.update({
				id: priceToUpdate!.id,
				price: 149.99,
			});

			expect(updated).toBeDefined();
			expect(updated.price).toBe(formatNumeric(149.99, 6));
		});

		it.sequential("should delete a product price", async () => {
			const prices = await ctx.caller.price.product.getByProduct(testProductId);
			const priceToDelete = prices.find((p) => p.uomCode === "PK");

			expect(priceToDelete).toBeDefined();

			await ctx.caller.price.product.delete(priceToDelete!.id);

			const remainingPrices =
				await ctx.caller.price.product.getByProduct(testProductId);
			expect(remainingPrices.length).toBe(prices.length - 1);
			expect(remainingPrices.find((p) => p.uomCode === "PK")).toBeUndefined();
		});
	});

	describe("Product Price CRUD Operations", () => {
		let testProductId: string;
		let testPriceListId: string;

		beforeAll(async () => {
			// Crear producto sin precios
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `SKU_CRUD_${nanoid(8)}`,
					name: "Product for Price CRUD",
					baseUom: "EA",
					categoryId: ctx.defaultCategoryId,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await ctx.caller.product.create(productInput);
			testProductId = product.id;

			const priceListInput: inferProcedureInput<
				AppRouter["price"]["list"]["create"]
			> = {
				code: `PL_CRUD_${nanoid(5)}`,
				name: "Price List for CRUD",
				type: "public",
				currency: "USD",
			};
			const pl = await ctx.caller.price.list.create(priceListInput);
			testPriceListId = pl.id;
		});

		it.sequential("should create product price manually", async () => {
			const input: inferProcedureInput<
				AppRouter["price"]["product"]["create"]
			> = {
				productId: testProductId,
				priceListId: testPriceListId,
				uomCode: "EA",
				price: 79.99,
				currency: "USD",
				minQty: 1,
			};

			const created = await ctx.caller.price.product.create(input);
			expect(created).toBeDefined();
			expect(created.productId).toBe(testProductId);
			expect(Number(created.price)).toBe(79.99);
		});

		it.sequential("should get prices by price list", async () => {
			const prices =
				await ctx.caller.price.product.getByPriceList(testPriceListId);
			expect(prices).toBeDefined();
			expect(Array.isArray(prices)).toBe(true);
			expect(prices.length).toBeGreaterThan(0);
		});

		it.sequential("should get active price for product", async () => {
			const input: inferProcedureInput<
				AppRouter["price"]["product"]["getActive"]
			> = {
				productId: testProductId,
				uomCode: "EA",
				qty: 1,
				priceListId: testPriceListId,
			};

			const activePrice = await ctx.caller.price.product.getActive(input);
			expect(activePrice).toBeDefined();
			expect(activePrice?.productId).toBe(testProductId);
		});
	});

	describe("Discount Rule Management", () => {
		it("should get all discount rules", async () => {
			const rules = await ctx.caller.price.discount.getAll();
			expect(rules).toBeDefined();
			expect(Array.isArray(rules)).toBe(true);
		});

		it.sequential("should create a percentage discount rule", async () => {
			const input: inferProcedureInput<
				AppRouter["price"]["discount"]["create"]
			> = {
				code: `DISC_PCT_${nanoid(5)}`,
				name: "10% Off Everything",
				type: "percentage",
				value: 10,
				currency: "USD",
				appliesTo: "global",
				combinable: false,
			};

			const created = await ctx.caller.price.discount.create(input);
			expect(created).toBeDefined();
			expect(created.type).toBe("percentage");
			expect(created.value).toBe(formatNumeric(10, 6));
		});

		it.sequential("should create a fixed amount discount rule", async () => {
			const input: inferProcedureInput<
				AppRouter["price"]["discount"]["create"]
			> = {
				code: `DISC_FIX_${nanoid(5)}`,
				name: "$5 Off",
				type: "fixed",
				value: 5,
				currency: "USD",
				appliesTo: "global",
				combinable: true,
			};

			const created = await ctx.caller.price.discount.create(input);
			expect(created).toBeDefined();
			expect(created.type).toBe("fixed");
			expect(created.value).toBe(formatNumeric(5, 6));
		});

		it.sequential("should get discount rule by id", async () => {
			const input: inferProcedureInput<
				AppRouter["price"]["discount"]["create"]
			> = {
				code: `DISC_GET_${nanoid(5)}`,
				name: "Discount for Get Test",
				type: "percentage",
				value: 15,
				appliesTo: "global",
			};

			const created = await ctx.caller.price.discount.create(input);
			const retrieved = await ctx.caller.price.discount.getById(created.id);

			expect(retrieved).toBeDefined();
			expect(retrieved?.id).toBe(created.id);
		});

		it.sequential("should calculate percentage discount", async () => {
			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `SKU_DISC_${nanoid(8)}`,
					name: "Product for Discount Test",
					baseUom: "EA",
					categoryId: ctx.defaultCategoryId,
					trackingLevel: "none",
					isPhysical: true,
				};
			const product = await ctx.caller.product.create(productInput);
			const input: inferProcedureInput<
				AppRouter["price"]["discount"]["calculate"]
			> = {
				productId: product.id,
				basePrice: 100,
				qty: 1,
				uomCode: "EA",
			};

			const result = await ctx.caller.price.discount.calculate(input);
			expect(result).toBeDefined();
			expect(result.originalPrice).toBe(100);
			expect(result.finalPrice).toBeLessThanOrEqual(100);
		});

		it.sequential("should update a discount rule", async () => {
			const input: inferProcedureInput<
				AppRouter["price"]["discount"]["create"]
			> = {
				code: `DISC_UPD_${nanoid(5)}`,
				name: "Original Discount",
				type: "percentage",
				value: 5,
				appliesTo: "global",
			};

			const created = await ctx.caller.price.discount.create(input);
			const updated = await ctx.caller.price.discount.update({
				id: created.id,
				name: "Updated Discount",
				value: 20,
			});

			expect(updated).toBeDefined();
			expect(updated.name).toBe("Updated Discount");
			expect(updated.value).toBe(formatNumeric(20, 6));
		});

		it.sequential("should delete a discount rule", async () => {
			const input: inferProcedureInput<
				AppRouter["price"]["discount"]["create"]
			> = {
				code: `DISC_DEL_${nanoid(5)}`,
				name: "Discount to Delete",
				type: "percentage",
				value: 25,
				appliesTo: "global",
			};

			const created = await ctx.caller.price.discount.create(input);
			await ctx.caller.price.discount.delete(created.id);

			const retrieved = await ctx.caller.price.discount.getById(created.id);
			expect(retrieved).toBeUndefined();
		});
	});

	describe("Discount by Product and Category with Multiple UOMs", () => {
		let testCategoryId: string;
		let productInCategoryId: string;
		let productDefaultCategoryId: string;
		// Precios diferentes para cada producto
		const defaultProductEaPrice = 150;
		const defaultProductPkPrice = 800; // 150 * 6 = 900, pero damos descuento por paquete
		const categoryProductEaPrice = 80;
		const categoryProductPkPrice = 420; // 80 * 6 = 480, descuento por paquete

		beforeAll(async () => {
			// Desactivar todos los descuentos globales existentes para evitar interferencias
			const existingRules = await ctx.caller.price.discount.getAll();
			for (const rule of existingRules) {
				if (rule.appliesTo === "global" && rule.isActive) {
					await ctx.caller.price.discount.update({
						id: rule.id,
						isActive: false,
					});
				}
			}

			// 1. Crear categoría de producto
			const categoryInput: inferProcedureInput<
				AppRouter["product"]["category"]["create"]
			> = {
				code: `TEST_CAT_${nanoid(5)}`,
				name: "Test Category for Discounts",
			};
			const [category] =
				await ctx.caller.product.category.create(categoryInput);
			testCategoryId = category.id;

			// 2. Crear producto en categoría por defecto CON MULTIPLES UOMS Y PRECIOS
			const productDefaultInput: inferProcedureInput<
				AppRouter["product"]["create"]
			> = {
				sku: `SKU_DEFAULT_${nanoid(8)}`,
				name: "Premium Product in Default Category",
				baseUom: "EA",
				categoryId: ctx.defaultCategoryId,
				trackingLevel: "none",
				isPhysical: true,
				productUoms: [
					{
						uomCode: "PK",
						qtyInBase: "6",
					},
				],
				prices: [
					{
						uomCode: "EA",
						price: defaultProductEaPrice,
						currency: "USD",
						minQty: 1,
					},
					{
						uomCode: "PK",
						price: defaultProductPkPrice,
						currency: "USD",
						minQty: 1,
					},
				],
			};
			const productDefault =
				await ctx.caller.product.create(productDefaultInput);
			productDefaultCategoryId = productDefault.id;

			// 3. Crear producto en categoría específica CON MULTIPLES UOMS Y PRECIOS
			const productCategoryInput: inferProcedureInput<
				AppRouter["product"]["create"]
			> = {
				sku: `SKU_CAT_${nanoid(8)}`,
				name: "Budget Product in Test Category",
				baseUom: "EA",
				categoryId: testCategoryId,
				trackingLevel: "none",
				isPhysical: true,
				productUoms: [
					{
						uomCode: "PK",
						qtyInBase: "6",
					},
				],
				prices: [
					{
						uomCode: "EA",
						price: categoryProductEaPrice,
						currency: "USD",
						minQty: 1,
					},
					{
						uomCode: "PK",
						price: categoryProductPkPrice,
						currency: "USD",
						minQty: 1,
					},
				],
			};
			const productInCategory =
				await ctx.caller.product.create(productCategoryInput);
			productInCategoryId = productInCategory.id;
		});

		it.sequential(
			"should apply discount by product with different prices",
			async () => {
				// Crear descuento específico para el producto premium (25%)
				const productDiscountInput: inferProcedureInput<
					AppRouter["price"]["discount"]["create"]
				> = {
					code: `DISC_PROD_${nanoid(5)}`,
					name: "25% Off Premium Product",
					type: "percentage",
					value: 25,
					currency: "USD",
					appliesTo: "product",
					appliesToId: productDefaultCategoryId,
					combinable: false,
				};
				await ctx.caller.price.discount.create(productDiscountInput);

				// Calcular descuento para el producto específico usando EA (precio: $150)
				const calcInput: inferProcedureInput<
					AppRouter["price"]["discount"]["calculate"]
				> = {
					productId: productDefaultCategoryId,
					basePrice: defaultProductEaPrice,
					qty: 1,
					uomCode: "EA",
				};

				const result = await ctx.caller.price.discount.calculate(calcInput);

				// Verificar: 25% de $150 = $37.50 de descuento, precio final = $112.50
				expect(result).toBeDefined();
				expect(result.originalPrice).toBe(defaultProductEaPrice);
				expect(result.discountAmount).toBe(37.5);
				expect(result.finalPrice).toBe(112.5);
				expect(result.appliedRules).toHaveLength(1);
				expect(result.appliedRules[0].discountType).toBe("percentage");
				expect(result.appliedRules[0].discountValue).toBe(25);
				expect(result.appliedRules[0].discountAmount).toBe(37.5);
			},
		);

		it.sequential(
			"should apply discount by category with different prices",
			async () => {
				// Crear descuento para la categoría específica (20%)
				const categoryDiscountInput: inferProcedureInput<
					AppRouter["price"]["discount"]["create"]
				> = {
					code: `DISC_CAT_${nanoid(5)}`,
					name: "20% Off Budget Category",
					type: "percentage",
					value: 20,
					currency: "USD",
					appliesTo: "category",
					appliesToId: testCategoryId,
					combinable: false,
				};
				await ctx.caller.price.discount.create(categoryDiscountInput);

				// Calcular descuento para el producto en esa categoría usando EA (precio: $80)
				const calcInput: inferProcedureInput<
					AppRouter["price"]["discount"]["calculate"]
				> = {
					productId: productInCategoryId,
					basePrice: categoryProductEaPrice,
					qty: 1,
					uomCode: "EA",
				};

				const result = await ctx.caller.price.discount.calculate(calcInput);

				// Verificar: 20% de $80 = $16 de descuento, precio final = $64
				expect(result).toBeDefined();
				expect(result.originalPrice).toBe(categoryProductEaPrice);
				expect(result.discountAmount).toBe(16);
				expect(result.finalPrice).toBe(64);
				expect(result.appliedRules).toHaveLength(1);
				expect(result.appliedRules[0].discountType).toBe("percentage");
				expect(result.appliedRules[0].discountValue).toBe(20);
				expect(result.appliedRules[0].discountAmount).toBe(16);
			},
		);

		it.sequential(
			"should not apply category discount to product in different category",
			async () => {
				// Intentar aplicar el descuento de categoría al producto en categoría por defecto
				// Usando precio del producto premium: $150
				const calcInput: inferProcedureInput<
					AppRouter["price"]["discount"]["calculate"]
				> = {
					productId: productDefaultCategoryId,
					basePrice: defaultProductEaPrice,
					qty: 1,
					uomCode: "EA",
				};

				const result = await ctx.caller.price.discount.calculate(calcInput);

				// El producto en categoría por defecto no debería recibir el descuento de categoría
				// Solo debería tener el descuento por producto (25% de $150 = $37.5)
				expect(result).toBeDefined();
				expect(result.originalPrice).toBe(defaultProductEaPrice);
				expect(result.discountAmount).toBe(37.5);
				expect(result.finalPrice).toBe(112.5);
			},
		);

		it.sequential("should apply fixed amount discount correctly", async () => {
			// Crear descuento fijo de $25 para el producto de categoría
			const fixedDiscountInput: inferProcedureInput<
				AppRouter["price"]["discount"]["create"]
			> = {
				code: `DISC_FIXED_${nanoid(5)}`,
				name: "$25 Off Fixed",
				type: "fixed",
				value: 25,
				currency: "USD",
				appliesTo: "product",
				appliesToId: productInCategoryId,
				combinable: false,
			};
			await ctx.caller.price.discount.create(fixedDiscountInput);

			// Calcular con precio del producto de categoría: $80
			const calcInput: inferProcedureInput<
				AppRouter["price"]["discount"]["calculate"]
			> = {
				productId: productInCategoryId,
				basePrice: categoryProductEaPrice,
				qty: 1,
				uomCode: "EA",
			};

			const result = await ctx.caller.price.discount.calculate(calcInput);

			// Ahora tiene dos descuentos aplicables: 20% categoría ($16) y $25 fijo
			// El sistema debería elegir el mejor (no combinable)
			// 20% de $80 = $16 vs $25 fijo
			// Debería aplicar el de $25
			expect(result).toBeDefined();
			expect(result.originalPrice).toBe(categoryProductEaPrice);
			expect(result.discountAmount).toBe(25);
			expect(result.finalPrice).toBe(55);
		});

		it.sequential(
			"should apply discount for PK UOM with different price",
			async () => {
				// Crear descuento específico para compras en PK (30% off)
				const pkDiscountInput: inferProcedureInput<
					AppRouter["price"]["discount"]["create"]
				> = {
					code: `DISC_PK_${nanoid(5)}`,
					name: "30% Off When Buying Package",
					type: "percentage",
					value: 30,
					currency: "USD",
					appliesTo: "product",
					appliesToId: productDefaultCategoryId,
					combinable: false,
				};
				await ctx.caller.price.discount.create(pkDiscountInput);

				// Calcular descuento usando precio de PK: $800
				const calcInput: inferProcedureInput<
					AppRouter["price"]["discount"]["calculate"]
				> = {
					productId: productDefaultCategoryId,
					basePrice: defaultProductPkPrice,
					qty: 1,
					uomCode: "PK",
				};

				const result = await ctx.caller.price.discount.calculate(calcInput);

				// Verificar: 30% de $800 = $240 de descuento, precio final = $560
				// El sistema aplica el mejor descuento entre 25% (producto) y 30% (PK)
				expect(result).toBeDefined();
				expect(result.originalPrice).toBe(defaultProductPkPrice);
				// El mejor descuento es 30% = $240
				expect(result.discountAmount).toBe(240);
				expect(result.finalPrice).toBe(560);
				expect(result.appliedRules[0].discountValue).toBe(30);
			},
		);
	});

	describe("Discount by Customer", () => {
		it.sequential(
			"should apply discount only for specific customer",
			async () => {
				const categoryInput: inferProcedureInput<
					AppRouter["product"]["category"]["create"]
				> = {
					code: `TEST_CAT_${nanoid(5)}`,
					name: "Test Category",
				};
				const [category] =
					await ctx.caller.product.category.create(categoryInput);
				const testCategoryId = category.id;

				const customerInput: inferProcedureInput<
					AppRouter["customer"]["create"]
				> = {
					code: `VIP-${nanoid(5)}`,
					name: "VIP Customer",
				};
				const customers = await ctx.caller.customer.create(customerInput);
				const vipCustomerId = customers[0].id;

				const regularCustomerInput: inferProcedureInput<
					AppRouter["customer"]["create"]
				> = {
					code: `REG-${nanoid(5)}`,
					name: "Regular Customer",
				};
				const regularCustomers =
					await ctx.caller.customer.create(regularCustomerInput);
				const regularCustomerId = regularCustomers[0].id;

				const productInput: inferProcedureInput<
					AppRouter["product"]["create"]
				> = {
					sku: `PROD-CUST-${nanoid(5)}`,
					name: "Product for Customer Discount",
					categoryId: testCategoryId,
					baseUom: "EA",
					prices: [
						{
							uomCode: "EA",
							price: 100,
							currency: "USD",
						},
					],
				};
				const product = await ctx.caller.product.create(productInput);
				const productId = product.id;

				// 15% off
				const vipDiscountInput: inferProcedureInput<
					AppRouter["price"]["discount"]["create"]
				> = {
					code: `DISC_VIP_${nanoid(5)}`,
					name: "VIP Customer 15% Off",
					type: "percentage",
					value: 15,
					currency: "USD",
					appliesTo: "customer",
					appliesToId: vipCustomerId,
					combinable: false,
				};
				await ctx.caller.price.discount.create(vipDiscountInput);

				// Test 1: VIP customer should get 15% discount
				const vipCalcInput: inferProcedureInput<
					AppRouter["price"]["discount"]["calculate"]
				> = {
					productId: productId,
					basePrice: 100,
					qty: 1,
					uomCode: "EA",
					customerId: vipCustomerId,
				};
				const vipResult =
					await ctx.caller.price.discount.calculate(vipCalcInput);
				expect(vipResult).toBeDefined();
				expect(vipResult.originalPrice).toBe(100);
				expect(vipResult.discountAmount).toBe(15); // 15% of 100
				expect(vipResult.finalPrice).toBe(85);
				expect(vipResult.appliedRules).toHaveLength(1);
				expect(vipResult.appliedRules[0].discountValue).toBe(15);

				// Test 2: Regular customer should NOT get discount
				const regularCalcInput: inferProcedureInput<
					AppRouter["price"]["discount"]["calculate"]
				> = {
					productId: productId,
					basePrice: 100,
					qty: 1,
					uomCode: "EA",
					customerId: regularCustomerId,
				};
				const regularResult =
					await ctx.caller.price.discount.calculate(regularCalcInput);
				expect(regularResult).toBeDefined();
				expect(regularResult.originalPrice).toBe(100);
				expect(regularResult.discountAmount).toBe(0);
				expect(regularResult.finalPrice).toBe(100);
				expect(regularResult.appliedRules).toHaveLength(0);

				// Test 3: No customer specified should NOT get discount
				const noCustomerCalcInput: inferProcedureInput<
					AppRouter["price"]["discount"]["calculate"]
				> = {
					productId: productId,
					basePrice: 100,
					qty: 1,
					uomCode: "EA",
				};
				const noCustomerResult =
					await ctx.caller.price.discount.calculate(noCustomerCalcInput);
				expect(noCustomerResult).toBeDefined();
				expect(noCustomerResult.originalPrice).toBe(100);
				expect(noCustomerResult.discountAmount).toBe(0);
				expect(noCustomerResult.finalPrice).toBe(100);
				expect(noCustomerResult.appliedRules).toHaveLength(0);
			},
		);

		it.sequential(
			"should apply fixed amount discount for specific customer",
			async () => {
				// Create category
				const categoryInput: inferProcedureInput<
					AppRouter["product"]["category"]["create"]
				> = {
					code: `TEST_CAT_${nanoid(5)}`,
					name: "Test Category",
				};
				const [category] =
					await ctx.caller.product.category.create(categoryInput);
				const testCategoryId = category.id;

				// Create a customer
				const customerInput: inferProcedureInput<
					AppRouter["customer"]["create"]
				> = {
					code: `CUST-${nanoid(5)}`,
					name: "Special Customer",
				};
				const customers = await ctx.caller.customer.create(customerInput);
				const specialCustomerId = customers[0].id;

				// Create product with price
				const productInput: inferProcedureInput<
					AppRouter["product"]["create"]
				> = {
					sku: `PROD-FIXED-${nanoid(5)}`,
					name: "Product for Fixed Discount",
					categoryId: testCategoryId,
					baseUom: "EA",
					prices: [
						{
							uomCode: "EA",
							price: 200,
							currency: "USD",
						},
					],
				};
				const product = await ctx.caller.product.create(productInput);
				const productId = product.id;

				// Create fixed amount discount for special customer ($50 off)
				const fixedDiscountInput: inferProcedureInput<
					AppRouter["price"]["discount"]["create"]
				> = {
					code: `DISC_FIXED_${nanoid(5)}`,
					name: "Special Customer $50 Off",
					type: "fixed",
					value: 50,
					currency: "USD",
					appliesTo: "customer",
					appliesToId: specialCustomerId,
					combinable: false,
				};
				await ctx.caller.price.discount.create(fixedDiscountInput);

				// Calculate discount for special customer
				const calcInput: inferProcedureInput<
					AppRouter["price"]["discount"]["calculate"]
				> = {
					productId: productId,
					basePrice: 200,
					qty: 1,
					uomCode: "EA",
					customerId: specialCustomerId,
				};
				const result = await ctx.caller.price.discount.calculate(calcInput);

				expect(result).toBeDefined();
				expect(result.originalPrice).toBe(200);
				expect(result.discountAmount).toBe(50);
				expect(result.finalPrice).toBe(150);
				expect(result.appliedRules).toHaveLength(1);
				expect(result.appliedRules[0].discountType).toBe("fixed");
			},
		);

		it.sequential(
			"should allow combinable customer discounts with global discounts",
			async () => {
				// Create category
				const categoryInput: inferProcedureInput<
					AppRouter["product"]["category"]["create"]
				> = {
					code: `TEST_CAT_${nanoid(5)}`,
					name: "Test Category",
				};
				const [category] =
					await ctx.caller.product.category.create(categoryInput);
				const testCategoryId = category.id;

				// Create a customer
				const customerInput: inferProcedureInput<
					AppRouter["customer"]["create"]
				> = {
					code: `CUST-${nanoid(5)}`,
					name: "Combo Customer",
				};
				const customers = await ctx.caller.customer.create(customerInput);
				const comboCustomerId = customers[0].id;

				// Create product with price
				const productInput: inferProcedureInput<
					AppRouter["product"]["create"]
				> = {
					sku: `PROD-COMBO-${nanoid(5)}`,
					name: "Product for Combo Discount",
					categoryId: testCategoryId,
					baseUom: "EA",
					prices: [
						{
							uomCode: "EA",
							price: 100,
							currency: "USD",
						},
					],
				};
				const product = await ctx.caller.product.create(productInput);
				const productId = product.id;

				// Create combinable customer discount (10% off)
				const customerDiscountInput: inferProcedureInput<
					AppRouter["price"]["discount"]["create"]
				> = {
					code: `DISC_CUST_${nanoid(5)}`,
					name: "Combo Customer 10% Off",
					type: "percentage",
					value: 10,
					currency: "USD",
					appliesTo: "customer",
					appliesToId: comboCustomerId,
					combinable: true,
				};
				await ctx.caller.price.discount.create(customerDiscountInput);

				// Create combinable global discount (5% off for everyone)
				const globalDiscountInput: inferProcedureInput<
					AppRouter["price"]["discount"]["create"]
				> = {
					code: `DISC_GLOBAL_${nanoid(5)}`,
					name: "Global 5% Off",
					type: "percentage",
					value: 5,
					currency: "USD",
					appliesTo: "global",
					combinable: true,
				};
				await ctx.caller.price.discount.create(globalDiscountInput);

				// Calculate discount - should get both 10% + 5% = 15% total
				const calcInput: inferProcedureInput<
					AppRouter["price"]["discount"]["calculate"]
				> = {
					productId: productId,
					basePrice: 100,
					qty: 1,
					uomCode: "EA",
					customerId: comboCustomerId,
				};
				const result = await ctx.caller.price.discount.calculate(calcInput);

				expect(result).toBeDefined();
				expect(result.originalPrice).toBe(100);
				expect(result.discountAmount).toBe(15); // 10% + 5% = 15
				expect(result.finalPrice).toBe(85);
				expect(result.appliedRules).toHaveLength(2);
			},
		);
	});

	describe("Tiered Discounts", () => {
		let testCategoryId: string;
		let productId: string;

		beforeAll(async () => {
			// Desactivar todos los descuentos globales existentes para evitar interferencias
			const existingRules = await ctx.caller.price.discount.getAll();
			for (const rule of existingRules) {
				if (rule.appliesTo === "global" && rule.isActive) {
					await ctx.caller.price.discount.update({
						id: rule.id,
						isActive: false,
					});
				}
			}

			const categoryInput: inferProcedureInput<
				AppRouter["product"]["category"]["create"]
			> = {
				code: `TIERED_CAT_${nanoid(5)}`,
				name: "Test Category for Tiered Discounts",
			};
			const [category] =
				await ctx.caller.product.category.create(categoryInput);
			testCategoryId = category.id;

			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `TIERED_PROD_${nanoid(5)}`,
					name: "Product for Tiered Discounts",
					categoryId: testCategoryId,
					baseUom: "EA",
					prices: [
						{
							uomCode: "EA",
							price: 100,
							currency: "USD",
						},
					],
				};
			const product = await ctx.caller.product.create(productInput);
			productId = product.id;
		});

		it.sequential("should apply tiered discount - tier 1", async () => {
			const tieredDiscountInput: inferProcedureInput<
				AppRouter["price"]["discount"]["create"]
			> = {
				code: `TIERED_${nanoid(5)}`,
				name: "Tiered Discount",
				type: "tiered",
				value: 0,
				currency: "USD",
				appliesTo: "global",
				conditions: {
					tiers: [
						{ minQty: 1, maxQty: 10, discount: 5, type: "percentage" },
						{ minQty: 11, maxQty: 50, discount: 10, type: "percentage" },
						{ minQty: 51, discount: 15, type: "percentage" },
					],
				},
				combinable: false,
			};
			await ctx.caller.price.discount.create(tieredDiscountInput);

			const calcInput: inferProcedureInput<
				AppRouter["price"]["discount"]["calculate"]
			> = {
				productId: productId,
				basePrice: 100,
				qty: 5,
				uomCode: "EA",
			};
			const result = await ctx.caller.price.discount.calculate(calcInput);

			expect(result).toBeDefined();
			expect(result.originalPrice).toBe(100);
			expect(result.discountAmount).toBe(5);
			expect(result.finalPrice).toBe(95);
		});

		it.sequential("should apply tiered discount - tier 2", async () => {
			const calcInput: inferProcedureInput<
				AppRouter["price"]["discount"]["calculate"]
			> = {
				productId: productId,
				basePrice: 100,
				qty: 25,
				uomCode: "EA",
			};
			const result = await ctx.caller.price.discount.calculate(calcInput);

			expect(result).toBeDefined();
			expect(result.discountAmount).toBe(10);
			expect(result.finalPrice).toBe(90);
		});

		it.sequential("should apply tiered discount - tier 3", async () => {
			const calcInput: inferProcedureInput<
				AppRouter["price"]["discount"]["calculate"]
			> = {
				productId: productId,
				basePrice: 100,
				qty: 60,
				uomCode: "EA",
			};
			const result = await ctx.caller.price.discount.calculate(calcInput);

			expect(result).toBeDefined();
			expect(result.discountAmount).toBe(15);
			expect(result.finalPrice).toBe(85);
		});
	});

	describe("Discount with Conditions", () => {
		let testCategoryId: string;
		let productId: string;

		beforeAll(async () => {
			// Desactivar todos los descuentos globales existentes para evitar interferencias
			const existingRules = await ctx.caller.price.discount.getAll();
			for (const rule of existingRules) {
				if (rule.appliesTo === "global" && rule.isActive) {
					await ctx.caller.price.discount.update({
						id: rule.id,
						isActive: false,
					});
				}
			}

			const categoryInput: inferProcedureInput<
				AppRouter["product"]["category"]["create"]
			> = {
				code: `COND_CAT_${nanoid(5)}`,
				name: "Test Category for Conditions",
			};
			const [category] =
				await ctx.caller.product.category.create(categoryInput);
			testCategoryId = category.id;

			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `COND_PROD_${nanoid(5)}`,
					name: "Product for Conditions",
					categoryId: testCategoryId,
					baseUom: "EA",
					productUoms: [
						{
							uomCode: "PK",
							qtyInBase: "10",
						},
					],
					prices: [
						{
							uomCode: "EA",
							price: 100,
							currency: "USD",
						},
						{
							uomCode: "PK",
							price: 900,
							currency: "USD",
						},
					],
				};
			const product = await ctx.caller.product.create(productInput);
			productId = product.id;
		});

		it.sequential(
			"should not apply discount when qty is below minQty",
			async () => {
				const discountInput: inferProcedureInput<
					AppRouter["price"]["discount"]["create"]
				> = {
					code: `COND_MIN_${nanoid(5)}`,
					name: "Min Quantity Discount",
					type: "percentage",
					value: 15,
					currency: "USD",
					appliesTo: "global",
					conditions: {
						minQty: 10,
					},
					combinable: false,
				};
				await ctx.caller.price.discount.create(discountInput);

				const calcInput: inferProcedureInput<
					AppRouter["price"]["discount"]["calculate"]
				> = {
					productId: productId,
					basePrice: 100,
					qty: 5,
					uomCode: "EA",
				};
				const result = await ctx.caller.price.discount.calculate(calcInput);

				expect(result).toBeDefined();
				expect(result.discountAmount).toBe(0);
				expect(result.finalPrice).toBe(100);
				expect(result.appliedRules).toHaveLength(0);
			},
		);

		it.sequential("should apply discount when qty meets minQty", async () => {
			const calcInput: inferProcedureInput<
				AppRouter["price"]["discount"]["calculate"]
			> = {
				productId: productId,
				basePrice: 100,
				qty: 15,
				uomCode: "EA",
			};
			const result = await ctx.caller.price.discount.calculate(calcInput);

			expect(result).toBeDefined();
			expect(result.discountAmount).toBe(15);
			expect(result.finalPrice).toBe(85);
		});

		it.sequential("should apply discount only for specific UOM", async () => {
			const discountInput: inferProcedureInput<
				AppRouter["price"]["discount"]["create"]
			> = {
				code: `COND_UOM_${nanoid(5)}`,
				name: "UOM Specific Discount",
				type: "percentage",
				value: 20,
				currency: "USD",
				appliesTo: "global",
				conditions: {
					uomCodes: ["PK"],
				},
				combinable: false,
			};
			await ctx.caller.price.discount.create(discountInput);

			const calcInputPk: inferProcedureInput<
				AppRouter["price"]["discount"]["calculate"]
			> = {
				productId: productId,
				basePrice: 900,
				qty: 1,
				uomCode: "PK",
			};
			const resultPk = await ctx.caller.price.discount.calculate(calcInputPk);

			expect(resultPk).toBeDefined();
			expect(resultPk.discountAmount).toBe(180);
			expect(resultPk.finalPrice).toBe(720);

			const calcInputEa: inferProcedureInput<
				AppRouter["price"]["discount"]["calculate"]
			> = {
				productId: productId,
				basePrice: 100,
				qty: 1,
				uomCode: "EA",
			};
			const resultEa = await ctx.caller.price.discount.calculate(calcInputEa);

			expect(resultEa).toBeDefined();
			expect(resultEa.discountAmount).toBe(0);
			expect(resultEa.finalPrice).toBe(100);
		});
	});

	describe("Discount with Time Limits", () => {
		let testCategoryId: string;
		let productId: string;

		beforeAll(async () => {
			// Desactivar todos los descuentos globales existentes para evitar interferencias
			const existingRules = await ctx.caller.price.discount.getAll();
			for (const rule of existingRules) {
				if (rule.appliesTo === "global" && rule.isActive) {
					await ctx.caller.price.discount.update({
						id: rule.id,
						isActive: false,
					});
				}
			}

			const categoryInput: inferProcedureInput<
				AppRouter["product"]["category"]["create"]
			> = {
				code: `TIME_CAT_${nanoid(5)}`,
				name: "Test Category for Time Limits",
			};
			const [category] =
				await ctx.caller.product.category.create(categoryInput);
			testCategoryId = category.id;

			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `TIME_PROD_${nanoid(5)}`,
					name: "Product for Time Limits",
					categoryId: testCategoryId,
					baseUom: "EA",
					prices: [
						{
							uomCode: "EA",
							price: 100,
							currency: "USD",
						},
					],
				};
			const product = await ctx.caller.product.create(productInput);
			productId = product.id;
		});

		it.sequential(
			"should apply time-limited discount during valid time window",
			async () => {
				const now = new Date();
				const twentySecondsLater = new Date(now.getTime() + 20000);

				const discountInput: inferProcedureInput<
					AppRouter["price"]["discount"]["create"]
				> = {
					code: `TIME_${nanoid(5)}`,
					name: "Time-Limited Discount",
					type: "percentage",
					value: 15,
					currency: "USD",
					appliesTo: "global",
					combinable: false,
					startAt: now,
					endAt: twentySecondsLater,
				};
				await ctx.caller.price.discount.create(discountInput);

				const calcInput: inferProcedureInput<
					AppRouter["price"]["discount"]["calculate"]
				> = {
					productId: productId,
					basePrice: 100,
					qty: 1,
					uomCode: "EA",
				};
				const resultBefore =
					await ctx.caller.price.discount.calculate(calcInput);

				expect(resultBefore).toBeDefined();
				expect(resultBefore.discountAmount).toBe(15);
				expect(resultBefore.finalPrice).toBe(85);
			},
		);

		it.sequential(
			"should not apply time-limited discount after expiration",
			async () => {
				// Desactivar todos los descuentos globales existentes para evitar interferencias
				const existingRules = await ctx.caller.price.discount.getAll();
				for (const rule of existingRules) {
					if (rule.appliesTo === "global" && rule.isActive) {
						await ctx.caller.price.discount.update({
							id: rule.id,
							isActive: false,
						});
					}
				}

				// Create discount that already expired (startAt 20 seconds ago, endAt 10 seconds ago)
				const now = new Date();
				const twentySecondsAgo = new Date(now.getTime() - 20000);
				const tenSecondsAgo = new Date(now.getTime() - 10000);

				const discountInput: inferProcedureInput<
					AppRouter["price"]["discount"]["create"]
				> = {
					code: `TIME_EXP_${nanoid(5)}`,
					name: "Expired Time-Limited Discount",
					type: "percentage",
					value: 20,
					currency: "USD",
					appliesTo: "global",
					combinable: false,
					startAt: twentySecondsAgo,
					endAt: tenSecondsAgo,
				};
				await ctx.caller.price.discount.create(discountInput);

				const calcInput: inferProcedureInput<
					AppRouter["price"]["discount"]["calculate"]
				> = {
					productId: productId,
					basePrice: 100,
					qty: 1,
					uomCode: "EA",
				};
				const resultAfter =
					await ctx.caller.price.discount.calculate(calcInput);

				expect(resultAfter).toBeDefined();
				expect(resultAfter.discountAmount).toBe(0);
				expect(resultAfter.finalPrice).toBe(100);
				expect(resultAfter.appliedRules).toHaveLength(0);
			},
		);
	});

	describe("Discount Conditions", () => {
		let testCategoryId: string;
		let productId: string;

		beforeAll(async () => {
			const categoryInput: inferProcedureInput<
				AppRouter["product"]["category"]["create"]
			> = {
				code: `SIMPLE_CAT_${nanoid(5)}`,
				name: "Simple Test Category",
			};
			const [category] =
				await ctx.caller.product.category.create(categoryInput);
			testCategoryId = category.id;

			const productInput: inferProcedureInput<AppRouter["product"]["create"]> =
				{
					sku: `SIMPLE_PROD_${nanoid(5)}`,
					name: "Simple Test Product",
					categoryId: testCategoryId,
					baseUom: "EA",
					prices: [
						{
							uomCode: "EA",
							price: 100,
							currency: "USD",
						},
					],
				};
			const product = await ctx.caller.product.create(productInput);
			productId = product.id;
		});

		beforeEach(async () => {
			// Desactivar todos los descuentos globales antes de cada test
			const existingRules = await ctx.caller.price.discount.getAll();
			for (const rule of existingRules) {
				if (rule.appliesTo === "global" && rule.isActive) {
					await ctx.caller.price.discount.update({
						id: rule.id,
						isActive: false,
					});
				}
			}
		});

		it("should apply discount with maxQty condition", async () => {
			const discountInput: inferProcedureInput<
				AppRouter["price"]["discount"]["create"]
			> = {
				code: `MAXQTY_${nanoid(5)}`,
				name: "Max Qty 5 Discount",
				type: "percentage",
				value: 10,
				currency: "USD",
				appliesTo: "global",
				conditions: {
					maxQty: 5,
				},
				combinable: false,
			};
			await ctx.caller.price.discount.create(discountInput);

			// qty=3 <= 5, should apply
			const resultLow = await ctx.caller.price.discount.calculate({
				productId: productId,
				basePrice: 100,
				qty: 3,
				uomCode: "EA",
			});
			expect(resultLow.discountAmount).toBe(10);

			// qty=10 > 5, should NOT apply
			const resultHigh = await ctx.caller.price.discount.calculate({
				productId: productId,
				basePrice: 100,
				qty: 10,
				uomCode: "EA",
			});
			expect(resultHigh.discountAmount).toBe(0);
		});

		it("should apply discount with minQty and maxQty range", async () => {
			const discountInput: inferProcedureInput<
				AppRouter["price"]["discount"]["create"]
			> = {
				code: `RANGE_${nanoid(5)}`,
				name: "Range 5-10 Discount",
				type: "fixed",
				value: 5,
				currency: "USD",
				appliesTo: "global",
				conditions: {
					minQty: 5,
					maxQty: 10,
				},
				combinable: false,
			};
			await ctx.caller.price.discount.create(discountInput);

			// qty=3 < 5, should NOT apply
			const resultLow = await ctx.caller.price.discount.calculate({
				productId: productId,
				basePrice: 100,
				qty: 3,
				uomCode: "EA",
			});
			expect(resultLow.discountAmount).toBe(0);

			// qty=7 in range [5,10], should apply
			const resultMid = await ctx.caller.price.discount.calculate({
				productId: productId,
				basePrice: 100,
				qty: 7,
				uomCode: "EA",
			});
			expect(resultMid.discountAmount).toBe(5);

			// qty=15 > 10, should NOT apply
			const resultHigh = await ctx.caller.price.discount.calculate({
				productId: productId,
				basePrice: 100,
				qty: 15,
				uomCode: "EA",
			});
			expect(resultHigh.discountAmount).toBe(0);
		});

		it("should apply discount with minOrderTotal condition", async () => {
			const discountInput: inferProcedureInput<
				AppRouter["price"]["discount"]["create"]
			> = {
				code: `ORDERTOTAL_${nanoid(5)}`,
				name: "Min Order $500 Discount",
				type: "percentage",
				value: 20,
				currency: "USD",
				appliesTo: "global",
				conditions: {
					minOrderTotal: 500,
				},
				combinable: false,
			};
			await ctx.caller.price.discount.create(discountInput);

			// orderTotal = 100 * 3 = 300 < 500, should NOT apply
			const resultLow = await ctx.caller.price.discount.calculate({
				productId: productId,
				basePrice: 100,
				qty: 3,
				uomCode: "EA",
			});
			expect(resultLow.discountAmount).toBe(0);

			// orderTotal = 100 * 6 = 600 >= 500, should apply (20% of basePrice = 20)
			const resultHigh = await ctx.caller.price.discount.calculate({
				productId: productId,
				basePrice: 100,
				qty: 6,
				uomCode: "EA",
			});
			expect(resultHigh.discountAmount).toBe(20);
		});

		it("should apply discount with daysOfWeek condition", async () => {
			const today = new Intl.DateTimeFormat("en-US", {
				weekday: "long",
			}).format(new Date());

			const discountInput: inferProcedureInput<
				AppRouter["price"]["discount"]["create"]
			> = {
				code: `TODAY_${nanoid(5)}`,
				name: `Discount for ${today}`,
				type: "percentage",
				value: 25,
				currency: "USD",
				appliesTo: "global",
				conditions: {
					daysOfWeek: [today],
				},
				combinable: false,
			};
			await ctx.caller.price.discount.create(discountInput);

			// Should apply because today matches
			const resultToday = await ctx.caller.price.discount.calculate({
				productId: productId,
				basePrice: 100,
				qty: 1,
				uomCode: "EA",
			});
			expect(resultToday.discountAmount).toBe(25);

			// Create discount for a different day (should not apply)
			const days = [
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
				"Sunday",
			];
			const tomorrow = days[(days.indexOf(today) + 1) % 7];

			const discountTomorrow: inferProcedureInput<
				AppRouter["price"]["discount"]["create"]
			> = {
				code: `TOMORROW_${nanoid(5)}`,
				name: `Discount for ${tomorrow}`,
				type: "percentage",
				value: 50,
				currency: "USD",
				appliesTo: "global",
				conditions: {
					daysOfWeek: [tomorrow],
				},
				combinable: false,
			};
			await ctx.caller.price.discount.create(discountTomorrow);

			// Should NOT apply because tomorrow is not today
			const resultTomorrow = await ctx.caller.price.discount.calculate({
				productId: productId,
				basePrice: 100,
				qty: 1,
				uomCode: "EA",
			});
			// Only the 25% discount for today should apply, not the 50% for tomorrow
			expect(resultTomorrow.discountAmount).toBe(25);
		});
	});
});
