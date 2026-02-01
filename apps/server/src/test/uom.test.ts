import type { inferProcedureInput } from "@trpc/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { productUom } from "@/db/schema/products";
import type { AppRouter } from "@/routers";
import { convertUomToBase, getUomConversionFactor } from "@/services/uom";
import { setupTestContext } from "./util";

describe("test UOM router and service", async () => {
	let ctx: Awaited<ReturnType<typeof setupTestContext>>;

	beforeAll(async () => {
		ctx = await setupTestContext();
	});

	describe("UOM Router", () => {
		it("should get all UOMs", async () => {
			const uoms = await ctx.caller.uom.getAll();
			expect(uoms).toBeDefined();
			expect(Array.isArray(uoms)).toBe(true);
			expect(uoms.length).toBeGreaterThan(0);

			// Check that common UOMs are present
			const uomCodes = uoms.map((u) => u.code);
			expect(uomCodes).toContain("EA"); // Each
			expect(uomCodes).toContain("PK"); // Pack
			expect(uomCodes).toContain("CS"); // Case
			expect(uomCodes).toContain("KG"); // Kilogram
		});

		it("should get UOM by code", async () => {
			const uom = await ctx.caller.uom.getByCode("EA");
			expect(uom).toBeDefined();
			expect(uom?.code).toBe("EA");
			expect(uom?.name).toBe("Each");
			expect(uom?.system).toBe("UNECE");
			expect(uom?.category).toBe("count");
			expect(uom?.isPackaging).toBe(false);
		});

		it("should return null for non-existent UOM code", async () => {
			const uom = await ctx.caller.uom.getByCode("NONEXISTENT");
			expect(uom).toBeUndefined();
		});

		describe("CRUD Operations", () => {
			describe("UOM Create/Update", () => {
				it("should create a new UOM", async () => {
					const testCode = `TEST_${nanoid(5)}`;
					const newUomInput: inferProcedureInput<AppRouter["uom"]["create"]> = {
						code: testCode,
						name: "Test Unit",
						system: "UNECE",
						category: "mass",
						isPackaging: false,
					};

					const createdUom = await ctx.caller.uom.create(newUomInput);
					expect(createdUom).toBeDefined();
					expect(createdUom.code).toBe(testCode);
					expect(createdUom.name).toBe("Test Unit");
					expect(createdUom.system).toBe("UNECE");
					expect(createdUom.category).toBe("mass");
					expect(createdUom.isPackaging).toBe(false);

					// Verify it can be retrieved
					const retrievedUom = await ctx.caller.uom.getByCode(testCode);
					expect(retrievedUom).toBeDefined();
					expect(retrievedUom?.code).toBe(testCode);
				});

				it("should throw error when creating UOM with duplicate code", async () => {
					const duplicateUomInput: inferProcedureInput<
						AppRouter["uom"]["create"]
					> = {
						code: "EA", // Already exists
						name: "Duplicate Each",
						system: "UNECE",
						category: "count",
						isPackaging: false,
					};

					await expect(
						ctx.caller.uom.create(duplicateUomInput),
					).rejects.toThrow('UOM with code "EA" already exists');
				});

				it("should update an existing UOM", async () => {
					// First create a test UOM
					const updateTestCode = `UPDATE_${nanoid(5)}`;
					const createInput: inferProcedureInput<AppRouter["uom"]["create"]> = {
						code: updateTestCode,
						name: "Original Name",
						system: "UNECE",
						category: "mass",
						isPackaging: false,
					};

					await ctx.caller.uom.create(createInput);

					// Now update it
					const updateInput: inferProcedureInput<AppRouter["uom"]["update"]> = {
						code: updateTestCode,
						name: "Updated Name",
						category: "volume",
						isPackaging: true,
					};

					const updatedUom = await ctx.caller.uom.update(updateInput);
					expect(updatedUom).toBeDefined();
					expect(updatedUom.code).toBe(updateTestCode);
					expect(updatedUom.name).toBe("Updated Name");
					expect(updatedUom.category).toBe("volume");
					expect(updatedUom.isPackaging).toBe(true);
					expect(updatedUom.system).toBe("UNECE"); // Should remain unchanged
				});

				it("should throw error when updating non-existent UOM", async () => {
					const updateInput: inferProcedureInput<AppRouter["uom"]["update"]> = {
						code: "NONEXISTENT",
						name: "Should Fail",
					};

					await expect(ctx.caller.uom.update(updateInput)).rejects.toThrow(
						'UOM with code "NONEXISTENT" not found',
					);
				});
			});

			describe("UOM Conversion Create/Update", () => {
				it("should create a new UOM conversion", async () => {
					// First create two test UOMs
					const testFromCode = `CONV_FROM_${nanoid(5)}`;
					const testToCode = `CONV_TO_${nanoid(5)}`;
					await ctx.caller.uom.create({
						code: testFromCode,
						name: "Test From Unit",
						system: "UNECE",
						category: "count",
						isPackaging: false,
					});

					await ctx.caller.uom.create({
						code: testToCode,
						name: "Test To Unit",
						system: "UNECE",
						category: "count",
						isPackaging: false,
					});

					// Create conversion
					const conversionInput: inferProcedureInput<
						AppRouter["uom"]["conversion"]["create"]
					> = {
						fromUom: testFromCode,
						toUom: testToCode,
						factor: "2.5",
					};

					const createdConversion =
						await ctx.caller.uom.conversion.create(conversionInput);
					expect(createdConversion).toBeDefined();
					expect(createdConversion.fromUom).toBe(testFromCode);
					expect(createdConversion.toUom).toBe(testToCode);
					expect(createdConversion.factor).toBe("2.500000000000");
				});

				it("should throw error when creating conversion with non-existent UOMs", async () => {
					const invalidConversionInput: inferProcedureInput<
						AppRouter["uom"]["conversion"]["create"]
					> = {
						fromUom: "NONEXISTENT",
						toUom: "EA",
						factor: "1.0",
					};

					await expect(
						ctx.caller.uom.conversion.create(invalidConversionInput),
					).rejects.toThrow('Source UOM "NONEXISTENT" not found');
				});

				it("should throw error when creating duplicate conversion", async () => {
					const duplicateConversionInput: inferProcedureInput<
						AppRouter["uom"]["conversion"]["create"]
					> = {
						fromUom: "PK",
						toUom: "EA", // Already exists globally
						factor: "5.0",
					};

					await expect(
						ctx.caller.uom.conversion.create(duplicateConversionInput),
					).rejects.toThrow('Conversion from "PK" to "EA" already exists');
				});

				it("should update an existing UOM conversion", async () => {
					// First create test UOMs and conversion
					const updateFromCode = `UP_FROM_${nanoid(5)}`;
					const updateToCode = `UP_TO_${nanoid(5)}`;
					await ctx.caller.uom.create({
						code: updateFromCode,
						name: "Update From Unit",
						system: "UNECE",
						category: "count",
						isPackaging: false,
					});

					await ctx.caller.uom.create({
						code: updateToCode,
						name: "Update To Unit",
						system: "UNECE",
						category: "count",
						isPackaging: false,
					});

					await ctx.caller.uom.conversion.create({
						fromUom: updateFromCode,
						toUom: updateToCode,
						factor: "1.0",
					});

					// Now update the conversion
					const updateInput: inferProcedureInput<
						AppRouter["uom"]["conversion"]["update"]
					> = {
						fromUom: updateFromCode,
						toUom: updateToCode,
						factor: "3.5",
					};

					const updatedConversion =
						await ctx.caller.uom.conversion.update(updateInput);
					expect(updatedConversion).toBeDefined();
					expect(updatedConversion.fromUom).toBe(updateFromCode);
					expect(updatedConversion.toUom).toBe(updateToCode);
					expect(updatedConversion.factor).toBe("3.500000000000");
				});

				it("should throw error when updating non-existent conversion", async () => {
					const invalidUpdateInput: inferProcedureInput<
						AppRouter["uom"]["conversion"]["update"]
					> = {
						fromUom: "PK",
						toUom: "NONEXISTENT",
						factor: "2.0",
					};

					await expect(
						ctx.caller.uom.conversion.update(invalidUpdateInput),
					).rejects.toThrow('Conversion from "PK" to "NONEXISTENT" not found');
				});
			});

			describe("Soft Delete Operations", () => {
				it("should create UOM with conversions using bulk creation", async () => {
					const bulkUomCode = `BULK_${nanoid(5)}`;

					const createInput: inferProcedureInput<
						AppRouter["uom"]["createWithConversions"]
					> = {
						code: bulkUomCode,
						name: "Bulk Created UOM",
						system: "UNECE",
						category: "mass",
						isPackaging: false,
						conversions: [
							{
								toUom: "EA",
								factor: "5.0",
							},
							{
								toUom: "PK",
								factor: "2.0",
							},
						],
					};

					const createdUom =
						await ctx.caller.uom.createWithConversions(createInput);
					expect(createdUom).toBeDefined();
					expect(createdUom.code).toBe(bulkUomCode);
					expect(createdUom.name).toBe("Bulk Created UOM");
					expect(createdUom.isActive).toBe(true);
				});

				it("should create UOM with conversions but skip invalid UOM references", async () => {
					const bulkUomCode = `BULK_INVALID_${nanoid(5)}`;

					const createInput: inferProcedureInput<
						AppRouter["uom"]["createWithConversions"]
					> = {
						code: bulkUomCode,
						name: "Bulk Created UOM with invalid conversions",
						system: "UNECE",
						category: "mass",
						isPackaging: false,
						conversions: [
							{
								toUom: "INVALID_UOM", // This UOM doesn't exist
								factor: "5.0",
							},
							{
								toUom: "EA", // This is valid
								factor: "3.0",
							},
						],
					};

					// The UOM should be created but only valid conversions should be added
					const createdUom =
						await ctx.caller.uom.createWithConversions(createInput);
					expect(createdUom).toBeDefined();
					expect(createdUom.code).toBe(bulkUomCode);
				});

				it("should deactivate an unused UOM", async () => {
					// Create a test UOM that won't be used anywhere
					const deactivateCode = `DEACTIVATE_${nanoid(5)}`;
					await ctx.caller.uom.create({
						code: deactivateCode,
						name: "Deactivatable UOM",
						system: "UNECE",
						category: "mass",
						isPackaging: false,
					});

					// Deactivate it
					const deactivatedUom = await ctx.caller.uom.deactivate({
						code: deactivateCode,
					});
					expect(deactivatedUom).toBeDefined();
					expect(deactivatedUom.code).toBe(deactivateCode);
					expect(deactivatedUom.isActive).toBe(false);

					// Verify it's not returned in regular queries
					const regularListing = await ctx.caller.uom.getAll();
					const inactiveUom = regularListing.find(
						(u) => u.code === deactivateCode,
					);
					expect(inactiveUom).toBeUndefined();

					// But is returned in admin queries
					const adminListing = await ctx.caller.uom.getAllIncludingInactive();
					const foundInactiveUom = adminListing.find(
						(u) => u.code === deactivateCode,
					);
					expect(foundInactiveUom).toBeDefined();
					expect(foundInactiveUom?.isActive).toBe(false);
				});

				it("should prevent deactivating UOM used as base UOM in active products", async () => {
					// Try to deactivate "EA" which is likely used as base UOM
					await expect(
						ctx.caller.uom.deactivate({ code: "EA" }),
					).rejects.toThrow(
						/cannot deactivate.*used as base uom.*active product/i,
					);
				});

				it("should prevent deactivating UOM used in active product configurations", async () => {
					// Create a test product using a test UOM in productUom
					const testUomForProduct = `PRODUCT_UOM_${nanoid(5)}`;
					await ctx.caller.uom.create({
						code: testUomForProduct,
						name: "UOM for product config",
						system: "UNECE",
						category: "count",
						isPackaging: false,
					});

					// Create product with this UOM
					const productInput: inferProcedureInput<
						AppRouter["product"]["create"]
					> = {
						sku: nanoid(10),
						name: "Test Product Using UOM",
						baseUom: "EA",
						trackingLevel: "none",
						isPhysical: true,
						categoryId: ctx.defaultCategoryId,
						productUoms: [
							{
								uomCode: testUomForProduct,
								qtyInBase: "8",
							},
						],
					};

					await ctx.caller.product.create(productInput);

					// Now try to deactivate the UOM - should fail
					await expect(
						ctx.caller.uom.deactivate({ code: testUomForProduct }),
					).rejects.toThrow(
						/cannot deactivate.*used in.*active product.*configuration/i,
					);
				});

				it("should activate a previously deactivated UOM", async () => {
					// Create and deactivate a UOM
					const activateCode = `ACTIVATE_${nanoid(5)}`;
					await ctx.caller.uom.create({
						code: activateCode,
						name: "UOM to activate",
						system: "UNECE",
						category: "mass",
						isPackaging: false,
					});

					await ctx.caller.uom.deactivate({ code: activateCode });

					// Verify it's deactivated
					const inactiveUom =
						await ctx.caller.uom.getByCodeIncludingInactive(activateCode);
					expect(inactiveUom?.isActive).toBe(false);

					// Activate it
					const activatedUom = await ctx.caller.uom.activate(activateCode);
					expect(activatedUom).toBeDefined();
					expect(activatedUom.code).toBe(activateCode);
					expect(activatedUom.isActive).toBe(true);

					// Verify it appears in regular queries now
					const regularUom = await ctx.caller.uom.getByCode(activateCode);
					expect(regularUom).toBeDefined();
					expect(regularUom?.isActive).toBe(true);
				});

				it("should throw error when activating already active UOM", async () => {
					await expect(ctx.caller.uom.activate("EA")).rejects.toThrow(
						"already active",
					);
				});

				it("should throw error when deactivating already inactive UOM", async () => {
					// Create and deactivate a UOM
					const alreadyInactiveCode = `INA_${nanoid(3)}`;
					await ctx.caller.uom.create({
						code: alreadyInactiveCode,
						name: "Already inactive UOM",
						system: "UNECE",
						category: "mass",
						isPackaging: false,
					});

					await ctx.caller.uom.deactivate({ code: alreadyInactiveCode });

					// Try to deactivate again
					await expect(
						ctx.caller.uom.deactivate({ code: alreadyInactiveCode }),
					).rejects.toThrow("already inactive");
				});

				it("should throw error when operating on non-existent UOM", async () => {
					await expect(
						ctx.caller.uom.deactivate({ code: "NONEXISTENT" }),
					).rejects.toThrow("not found");

					await expect(ctx.caller.uom.activate("NONEXISTENT")).rejects.toThrow(
						"not found",
					);
				});
			});
		});
	});

	describe("UOM Service Functions", () => {
		// Use a valid UUID format that doesn't exist in the database
		const nonexistentProductId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

		describe("convertUomToBase", () => {
			it("should return quantity as-is when UOM is already base", async () => {
				const result = await db.transaction(async (tx) => {
					return convertUomToBase(tx, nonexistentProductId, 100, "EA", "EA");
				});

				expect(result).toBe(100);
			});

			it("should convert using global uom conversion (PK to EA)", async () => {
				const result = await db.transaction(async (tx) => {
					return convertUomToBase(tx, nonexistentProductId, 5, "PK", "EA");
				});

				expect(result).toBe(30); // 5 PK * 6 EA/PK = 30 EA
			});

			it("should convert complex global conversion chain (CS to EA)", async () => {
				const result = await db.transaction(async (tx) => {
					return convertUomToBase(tx, nonexistentProductId, 2, "CS", "EA");
				});

				expect(result).toBe(72); // 2 CS * 36 EA/CS = 72 EA
			});

			it("should handle mass conversions (G to KG)", async () => {
				const result = await db.transaction(async (tx) => {
					return convertUomToBase(tx, nonexistentProductId, 1500, "G", "KG");
				});

				expect(result).toBe(1.5); // 1500g * 0.001 kg/g = 1.5 kg
			});

			it("should throw error when no conversion exists", async () => {
				await expect(
					db.transaction(async (tx) => {
						return convertUomToBase(
							tx,
							nonexistentProductId,
							10,
							"INVALID",
							"EA",
						);
					}),
				).rejects.toThrow("No conversion from INVALID to EA");
			});
		});

		describe("getUomConversionFactor", () => {
			it("should return 1 when converting to same UOM", async () => {
				const result = await db.transaction(async (tx) => {
					return getUomConversionFactor(tx, nonexistentProductId, "EA", "EA");
				});

				expect(result).toBe(1);
			});

			it("should get conversion factor using global conversion (PK to EA)", async () => {
				const result = await db.transaction(async (tx) => {
					return getUomConversionFactor(tx, nonexistentProductId, "EA", "PK");
				});

				expect(result).toBe(6); // 1 PK = 6 EA
			});

			it("should get conversion factor for complex chains (CS to PK)", async () => {
				const result = await db.transaction(async (tx) => {
					return getUomConversionFactor(tx, nonexistentProductId, "PK", "CS");
				});

				expect(result).toBe(6); // 1 CS = 6 PK
			});

			it("should handle length conversions (M to CM)", async () => {
				const result = await db.transaction(async (tx) => {
					return getUomConversionFactor(tx, nonexistentProductId, "M", "CM");
				});

				expect(result).toBe(0.01); // Conversion factor for M to CM
			});

			it("should throw error when no conversion exists", async () => {
				await expect(
					db.transaction(async (tx) => {
						return getUomConversionFactor(
							tx,
							nonexistentProductId,
							"INVALID",
							"EA",
						);
					}),
				).rejects.toThrow("No conversion from INVALID to EA");
			});
		});
	});

	describe("Integration Tests", () => {
		it("should create product with specific UOM conversions and test priority", async () => {
			// First create a product with base UOM = "EA" (Each)
			const input: inferProcedureInput<AppRouter["product"]["create"]> = {
				sku: nanoid(10),
				name: "Test Product for UOM",
				baseUom: "EA",
				trackingLevel: "none",
				isPhysical: true,
				categoryId: ctx.defaultCategoryId,
			};

			const createdProduct = await ctx.caller.product.create(input);
			expect(createdProduct).toBeDefined();

			// Add product-specific UOM conversion (1 PK = 10 EA instead of global 6)
			await db.transaction(async (tx) => {
				await tx.insert(productUom).values({
					productId: createdProduct.id,
					uomCode: "PK",
					qtyInBase: "10", // 1 PK = 10 EA
				});
			});

			// Test that convertUomToBase uses product-specific conversion (10) over global (6)
			const result = await db.transaction(async (tx) => {
				return convertUomToBase(tx, createdProduct.id, 3, "PK", "EA");
			});

			expect(result).toBe(30); // 3 PK * 10 EA/PK = 30 EA (product-specific conversion)

			// Test getUomConversionFactor also uses product-specific
			const factor = await db.transaction(async (tx) => {
				return getUomConversionFactor(tx, createdProduct.id, "EA", "PK");
			});

			expect(factor).toBe(10); // 1 PK = 10 EA (product-specific)
		});

		it("should handle multiple productUoms with different quantities using productUoms input", async () => {
			// Create a product with multiple productUoms defined in the input
			const input: inferProcedureInput<AppRouter["product"]["create"]> = {
				sku: nanoid(10),
				name: "Multi-UOM Test Product",
				baseUom: "EA",
				trackingLevel: "none",
				isPhysical: true,
				categoryId: ctx.defaultCategoryId,
				productUoms: [
					{
						uomCode: "PK",
						qtyInBase: "8", // 1 PK = 8 EA (different from global 6)
					},
					{
						uomCode: "CS",
						qtyInBase: "48", // 1 CS = 48 EA (6 PK * 8 EA/PK = 48)
					},
					{
						uomCode: "DZ",
						qtyInBase: "12", // 1 DZ = 12 EA (dozen)
					},
				],
			};

			const createdProduct = await ctx.caller.product.create(input);
			expect(createdProduct).toBeDefined();

			// Verify that the productUoms were created correctly
			const productUoms = await db.query.productUom.findMany({
				where: eq(productUom.productId, createdProduct.id),
			});

			expect(productUoms).toHaveLength(4); // EA (base) + PK + CS + DZ

			// Check that each productUom has the correct qtyInBase
			const pkUom = productUoms.find((pu) => pu.uomCode === "PK");
			const csUom = productUoms.find((pu) => pu.uomCode === "CS");
			const dzUom = productUoms.find((pu) => pu.uomCode === "DZ");
			const eaUom = productUoms.find((pu) => pu.uomCode === "EA");

			expect(pkUom?.qtyInBase).toBe("8.000000000");
			expect(csUom?.qtyInBase).toBe("48.000000000");
			expect(dzUom?.qtyInBase).toBe("12.000000000");
			expect(eaUom?.qtyInBase).toBe("1.000000000"); // Base UOM
			expect(eaUom?.isBase).toBe(true);

			// Test PK to EA conversion (uses product-specific: 8 EA/PK)
			const pkResult = await db.transaction(async (tx) => {
				return convertUomToBase(tx, createdProduct.id, 2, "PK", "EA");
			});
			expect(pkResult).toBe(16); // 2 PK * 8 EA/PK = 16 EA

			// Test CS to EA conversion (uses product-specific: 48 EA/CS)
			const csResult = await db.transaction(async (tx) => {
				return convertUomToBase(tx, createdProduct.id, 1, "CS", "EA");
			});
			expect(csResult).toBe(48); // 1 CS * 48 EA/CS = 48 EA

			// Test DZ to EA conversion (uses product-specific: 12 EA/DZ)
			const dzResult = await db.transaction(async (tx) => {
				return convertUomToBase(tx, createdProduct.id, 3, "DZ", "EA");
			});
			expect(dzResult).toBe(36); // 3 DZ * 12 EA/DZ = 36 EA

			// Test getUomConversionFactor for different UOMs
			const pkFactor = await db.transaction(async (tx) => {
				return getUomConversionFactor(tx, createdProduct.id, "EA", "PK");
			});
			expect(pkFactor).toBe(8); // 1 PK = 8 EA

			const csFactor = await db.transaction(async (tx) => {
				return getUomConversionFactor(tx, createdProduct.id, "EA", "CS");
			});
			expect(csFactor).toBe(48); // 1 CS = 48 EA

			const dzFactor = await db.transaction(async (tx) => {
				return getUomConversionFactor(tx, createdProduct.id, "EA", "DZ");
			});
			expect(dzFactor).toBe(12); // 1 DZ = 12 EA
		});
	});
});
