import type { inferProcedureInput } from "@trpc/server";
import { nanoid } from "nanoid";
import { beforeAll, describe, expect, it } from "vitest";
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
});
