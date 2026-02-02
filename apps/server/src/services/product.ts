import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import type z from "zod";
import { db } from "@/db";
import { organization } from "@/db/schema/auth";
import { inventoryLedger } from "@/db/schema/inventory";
import {
	priceList,
	productCategory,
	productIdentifiers,
	productImages,
	productPrice,
	product as productTable,
	productUom,
} from "@/db/schema/products";
import { uom, uomConversion } from "@/db/schema/uom";
import type {
	CreateProductCategoryInput,
	CreateProductInput,
	GetProductStockInput,
	UpdateProductCategoryInput,
} from "@/dto/product";
import type { Transaction } from "@/types";
import { getUomConversionFactor } from "./uom";

const getAllProducts = async () => {
	return await db.query.product.findMany({
		with: {
			category: true,
			images: true,
			organization: true,
			prices: true,
			uoms: true,
		},
	});
};

const getProductById = async (id: string) => {
	const product = await db.query.product.findFirst({
		with: {
			category: true,
			images: true,
			organization: true,
		},
		where: eq(productTable.id, id),
	});
	return product;
};
const getProductsByOrg = async (orgId: string) => {
	const product = await db.query.product.findMany({
		with: {
			category: true,
			images: true,
			organization: true,
		},
		where: eq(productTable.organizationId, orgId),
	});
	return product;
};

const getProductCategories = async () => {
	const categories = await db.query.productCategory.findMany();
	return categories;
};

const getProductIdentifiers = async () => {
	const identifiers = await db.query.productIdentifiers.findMany();
	return identifiers;
};

const createProduct = async (
	input: CreateProductInput,
	organizationId: string,
) => {
	return await db.transaction(async (tx) => {
		// Validate base UoM exists in uom table
		const [baseUom] = await tx
			.select()
			.from(uom)
			.where(eq(uom.code, input.baseUom))
			.limit(1);
		if (!baseUom) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid baseUom" });
		}

		let productUoms = input.productUoms || [];
		const baseUomExists = productUoms.some(
			(pu) => pu.uomCode === input.baseUom,
		);

		if (input.isPhysical && !baseUomExists) {
			productUoms = [
				...productUoms,
				{ uomCode: input.baseUom, qtyInBase: "1", isBase: true },
			];
		}

		// Validate and enrich productUoms with uom_conversion if needed
		for (const productUoM of productUoms) {
			const [uomRecord] = await tx
				.select()
				.from(uom)
				.where(eq(uom.code, productUoM.uomCode))
				.limit(1);
			if (!uomRecord) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Invalid uomCode: ${productUoM.uomCode}`,
				});
			}

			// If qtyInBase not provided and uomCode != baseUom, check uom_conversion
			if (!productUoM.qtyInBase && productUoM.uomCode !== input.baseUom) {
				const [conversion] = await tx
					.select({ factor: uomConversion.factor })
					.from(uomConversion)
					.where(
						sql`${uomConversion.fromUom} = ${productUoM.uomCode} AND ${uomConversion.toUom} = ${input.baseUom}`,
					)
					.limit(1);
				if (conversion) {
					productUoM.qtyInBase = conversion.factor;
				} else {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `No conversion found from ${productUoM.uomCode} to ${input.baseUom}`,
					});
				}
			}
		}

		const [createdProduct] = await tx
			.insert(productTable)
			.values({
				organizationId,
				sku: input.sku,
				name: input.name,
				description: input.description,
				categoryId: input.categoryId,
				baseUom: input.baseUom,
				trackingLevel: input.isPhysical ? input.trackingLevel : "none",
				perishable: input.perishable,
				shelfLifeDays: input.shelfLifeDays,
				attributes: input.attributes ?? {},
				isPhysical: input.isPhysical,
				productFamilyId: input.productFamilyId,
				suggestedRetailPrice: input.suggestedRetailPrice,
				defaultCost: input.defaultCost,
				defaultCurrency: input.defaultCurrency,
			})
			.returning();

		const prodId = createdProduct.id;

		if (productUoms.length > 0) {
			// Insert productUoms
			await tx.insert(productUom).values(
				productUoms.map((pu) => ({
					productId: prodId,
					uomCode: pu.uomCode,
					qtyInBase: (pu.qtyInBase || 1).toString(),
					isBase: pu.isBase ?? pu.uomCode === input.baseUom,
				})),
			);
		}

		if (input.images) {
			await tx.insert(productImages).values(
				input.images.map((img) => ({
					productId: prodId,
					productFamilyId: input.productFamilyId, // Optional link to family
					...img,
				})),
			);
		}

		// Insert identifiers if provided (e.g., different GTIN for package vs unit)
		if (input.identifiers?.length) {
			await tx.insert(productIdentifiers).values(
				input.identifiers.map((id) => ({
					productId: prodId,
					type: id.type,
					value: id.value,
					uomCode: id.uomCode,
				})),
			);
		}

		if (input.prices?.length) {
			let defaultPriceListId: string | undefined;
			const [existingPriceList] = await tx
				.select({ id: priceList.id })
				.from(priceList)
				.where(eq(priceList.code, "public"))
				.limit(1);
			//TODO: Remove this. create a default price list when a organization is created (afeterInsert hook)
			if (!existingPriceList) {
				const [newPriceList] = await tx
					.insert(priceList)
					.values({
						organizationId,
						code: "public",
						name: "Public Price List",
						type: "public",
						currency: input.defaultCurrency,
					})
					.returning({ id: priceList.id });
				defaultPriceListId = newPriceList.id;
			} else {
				defaultPriceListId = existingPriceList.id;
			}

			await tx.insert(productPrice).values(
				input.prices.map((pr) => ({
					productId: prodId,
					priceListId: pr.priceListId ?? defaultPriceListId, // Fallback to default
					customerId: pr.customerId,
					uomCode: pr.uomCode,
					price: pr.price.toString(), // Numeric
					currency: pr.currency,
					minQty: pr.minQty.toString(),
					effectiveFrom: pr.effectiveFrom,
					effectiveTo: pr.effectiveTo,
					isActive: true,
				})),
			);
		}

		return createdProduct;
	});
};

const getAllProductCategories = async () => {
	return await db.query.productCategory.findMany();
};

export const getAllProductCategoriesByOrg = async (orgId: string) => {
	const org = await db.query.organization.findFirst({
		where: eq(organization.id, orgId),
	});
	if (!org) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Organization not found",
		});
	}

	return await db.query.productCategory.findMany({
		where: eq(productCategory.organizationId, orgId),
	});
};

const getProductCategoryById = async (id: string) => {
	return await db.query.productCategory.findFirst({
		where: eq(productCategory.id, id),
	});
};

const getProductCategoryByCode = async (code: string) => {
	return await db.query.productCategory.findFirst({
		where: eq(productCategory.code, code),
	});
};

const createProductCategory = async (
	d: CreateProductCategoryInput,
	organizationId: string,
) => {
	return await db
		.insert(productCategory)
		.values({
			organizationId,
			name: d.name,
			code: d.code,
		})
		.returning();
};

const updateProductCategory = async ({
	id,
	...data
}: UpdateProductCategoryInput) => {
	return await db
		.update(productCategory)
		.set(data)
		.where(eq(productCategory.id, id));
};

const deleteProductCategory = async (id: string) => {
	return await db.delete(productCategory).where(eq(productCategory.id, id));
};

type GetStockArgs = {
	organizationId?: string;
	productId: string;
	warehouseId?: string;
};

export const _getStock = async (
	{ organizationId, productId, warehouseId }: GetStockArgs,
	tx: Transaction | undefined = undefined,
) => {
	const [stock] = await (tx || db)
		.select({
			totalQty: sql<number>`COALESCE(SUM(
        CASE 
          WHEN ${inventoryLedger.movementType} IN ('receipt', 'transfer_in', 'disassembly_in', 'adjustment_pos') THEN CAST(${inventoryLedger.qtyInBase} AS numeric)
          WHEN ${inventoryLedger.movementType} IN ('issue', 'transfer_out', 'disassembly_out', 'adjustment_neg') THEN -CAST(${inventoryLedger.qtyInBase} AS numeric)
          ELSE 0
        END
      ), 0)`,
			receiptQty: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryLedger.movementType} = 'receipt' THEN CAST(${inventoryLedger.qtyInBase} AS numeric) ELSE 0 END), 0)`,
			issueQty: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryLedger.movementType} = 'issue' THEN CAST(${inventoryLedger.qtyInBase} AS numeric) ELSE 0 END), 0)`,
			disassemblyInQty: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryLedger.movementType} = 'disassembly_in' THEN CAST(${inventoryLedger.qtyInBase} AS numeric) ELSE 0 END), 0)`,
			disassemblyOutQty: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryLedger.movementType} = 'disassembly_out' THEN -CAST(${inventoryLedger.qtyInBase} AS numeric) ELSE 0 END), 0)`,
		})
		.from(inventoryLedger)
		.where(
			and(
				eq(inventoryLedger.productId, productId),
				organizationId
					? eq(inventoryLedger.organizationId, organizationId)
					: undefined,
				warehouseId ? eq(inventoryLedger.warehouseId, warehouseId) : undefined,
			),
		);

	return stock;
};

export const getProductStock = async (
	d: GetProductStockInput,
	organizationId: string,
) => {
	return await db.transaction(async (tx) => {
		const [product] = await tx
			.select({
				id: productTable.id,
				baseUom: productTable.baseUom,
				isPhysical: productTable.isPhysical,
			})
			.from(productTable)
			.where(
				and(
					eq(productTable.id, d.productId),
					eq(productTable.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!product) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
		}
		if (!product.isPhysical) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Cannot get stock for non-physical products",
			});
		}

		const stock = await _getStock(
			{
				organizationId,
				productId: d.productId,
				warehouseId: d.warehouseId,
			},
			tx,
		);

		const totalQtyInBase = Number(stock?.totalQty || 0);

		let result = { totalQty: totalQtyInBase, uomCode: product.baseUom };
		if (d.uomCode && d.uomCode !== product.baseUom) {
			const factor = await getUomConversionFactor(
				tx,
				d.productId,
				product.baseUom, // from base UoM
				d.uomCode, // to target UoM
			);

			result = {
				totalQty: Math.floor(totalQtyInBase / factor),
				uomCode: d.uomCode,
			};
		}

		// Optional: Express as packages + units for CASO 2 (e.g., 3 PK + 4 EA)
		let breakdown: { uomCode: string; qty: number }[] | undefined;
		if (d.uomCode && d.uomCode !== product.baseUom) {
			const [packageUom] = await tx
				.select({
					uomCode: productUom.uomCode,
					qtyInBase: productUom.qtyInBase,
				})
				.from(productUom)
				.where(
					sql`${productUom.productId} = ${d.productId} AND ${productUom.uomCode} IN (SELECT ${uom.code} FROM ${uom} WHERE ${uom.isPackaging} = true)`,
				)
				.limit(1);

			if (packageUom) {
				const packages = Math.floor(
					totalQtyInBase / Number(packageUom.qtyInBase),
				);
				const units = totalQtyInBase % Number(packageUom.qtyInBase);
				breakdown = [
					{ uomCode: packageUom.uomCode, qty: packages },
					{ uomCode: product.baseUom, qty: units },
				];
			}
		}

		return {
			productId: d.productId,
			totalQty: result.totalQty,
			uomCode: result.uomCode,
			breakdown,
		};
	});
};

export {
	getAllProducts,
	getProductById,
	createProduct,
	getProductsByOrg,
	getProductCategories,
	getProductIdentifiers,
	createProductCategory,
	getAllProductCategories,
	getProductCategoryById,
	getProductCategoryByCode,
	updateProductCategory,
	deleteProductCategory,
};
