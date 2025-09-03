import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { db } from "@/db";
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

const getAllProducts = async () => {
	const allProducts = await db.query.product.findMany({
		with: {
			category: true,
			images: true,
			organization: true,
		},
	});
	return allProducts;
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

const createProduct = async (d: CreateProductInput) => {
	return await db.transaction(async (tx) => {
		// Validate base UoM exists in uom table
		const [baseUom] = await tx
			.select()
			.from(uom)
			.where(eq(uom.code, d.baseUom))
			.limit(1);
		if (!baseUom) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid baseUom" });
		}

		let productUoms = d.productUoms || [];
		const baseUomExists = productUoms.some((pu) => pu.uomCode === d.baseUom);

		if (d.isPhysical && !baseUomExists) {
			productUoms = [
				...productUoms,
				{ uomCode: d.baseUom, qtyInBase: "1", isBase: true },
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
			if (!productUoM.qtyInBase && productUoM.uomCode !== d.baseUom) {
				const [conversion] = await tx
					.select({ factor: uomConversion.factor })
					.from(uomConversion)
					.where(
						sql`${uomConversion.fromUom} = ${productUoM.uomCode} AND ${uomConversion.toUom} = ${d.baseUom}`,
					)
					.limit(1);
				if (conversion) {
					productUoM.qtyInBase = conversion.factor;
				} else {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `No conversion found from ${productUoM.uomCode} to ${d.baseUom}`,
					});
				}
			}
		}

		const [createdProduct] = await tx
			.insert(productTable)
			.values({
				organizationId: d.organizationId,
				sku: d.sku,
				name: d.name,
				description: d.description,
				categoryId: d.categoryId,
				baseUom: d.baseUom,
				trackingLevel: d.isPhysical ? d.trackingLevel : "none",
				perishable: d.perishable,
				shelfLifeDays: d.shelfLifeDays,
				attributes: d.attributes ?? {},
				isPhysical: d.isPhysical,
				productFamilyId: d.productFamilyId,
				suggestedRetailPrice: d.suggestedRetailPrice,
				defaultCost: d.defaultCost,
				defaultCurrency: d.defaultCurrency,
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
					isBase: pu.isBase ?? pu.uomCode === d.baseUom,
				})),
			);
		}

		if (d.images) {
			await tx.insert(productImages).values(
				d.images.map((img) => ({
					productId: prodId,
					productFamilyId: d.productFamilyId, // Optional link to family
					...img,
				})),
			);
		}

		// Insert identifiers if provided (e.g., different GTIN for package vs unit)
		if (d.identifiers?.length) {
			await tx.insert(productIdentifiers).values(
				d.identifiers.map((id) => ({
					productId: prodId,
					type: id.type,
					value: id.value,
					uomCode: id.uomCode,
				})),
			);
		}

		if (d.prices?.length) {
			let defaultPriceListId: string | undefined;
			const [existingPriceList] = await tx
				.select({ id: priceList.id })
				.from(priceList)
				.where(eq(priceList.code, "public"))
				.limit(1);
			if (!existingPriceList) {
				const [newPriceList] = await tx
					.insert(priceList)
					.values({
						organizationId: d.organizationId,
						code: "public",
						name: "Public Price List",
						type: "public",
						currency: d.defaultCurrency,
					})
					.returning({ id: priceList.id });
				defaultPriceListId = newPriceList.id;
			} else {
				defaultPriceListId = existingPriceList.id;
			}

			await tx.insert(productPrice).values(
				d.prices.map((pr) => ({
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

const createProductCategory = async (d: CreateProductCategoryInput) => {
	return await db
		.insert(productCategory)
		.values({
			organizationId: d.organizationId,
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

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const _getStock = async (
	{ organizationId, productId, warehouseId }: GetStockArgs,
	tx: Transaction | undefined = undefined,
) => {
	// const positiveMovements = ["receipt", "transfer_in", "disassembly_in", "adjustment_pos"];
	const [stock] = await (tx || db)
		.select({
			totalQty: sql<number>`SUM(CASE 
          WHEN ${inventoryLedger.movementType} IN ('receipt', 'transfer_in', 'adjustment_pos')THEN ${inventoryLedger.qtyInBase} 
          ELSE -${inventoryLedger.qtyInBase} 
        END)`,
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

export const getProductStock = async (d: GetProductStockInput) => {
	return await db.transaction(async (tx) => {
		// Validate product exists and is physical
		const [product] = await tx
			.select({
				id: productTable.id,
				baseUom: productTable.baseUom,
				isPhysical: productTable.isPhysical,
			})
			.from(productTable)
			.where(
				sql`${productTable.id} = ${d.productId} AND ${productTable.organizationId} = ${d.organizationId}`,
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
				organizationId: d.organizationId,
				productId: d.productId,
				warehouseId: d.warehouseId,
			},
			tx,
		);

		const totalQtyInBase = Number(stock?.totalQty || 0);

		// If uomCode specified, convert to requested UoM
		let result = { totalQty: totalQtyInBase, uomCode: product.baseUom };
		if (d.uomCode && d.uomCode !== product.baseUom) {
			// Validate uomCode
			const [uomRecord] = await tx
				.select()
				.from(uom)
				.where(eq(uom.code, d.uomCode))
				.limit(1);
			if (!uomRecord) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Invalid uomCode: ${d.uomCode}`,
				});
			}

			// Try productUom first
			const [productUomRecord] = await tx
				.select({ qtyInBase: productUom.qtyInBase })
				.from(productUom)
				.where(
					sql`${productUom.productId} = ${d.productId} AND ${productUom.uomCode} = ${d.uomCode}`,
				)
				.limit(1);

			if (productUomRecord) {
				result = {
					totalQty: totalQtyInBase / Number(productUomRecord.qtyInBase),
					uomCode: d.uomCode,
				};
			} else {
				// Fallback to uomConversion
				const [conversion] = await tx
					.select({ factor: uomConversion.factor })
					.from(uomConversion)
					.where(
						sql`${uomConversion.fromUom} = ${d.uomCode} AND ${uomConversion.toUom} = ${product.baseUom}`,
					)
					.limit(1);
				if (!conversion) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `No conversion from ${d.uomCode} to ${product.baseUom}`,
					});
				}
				result = {
					totalQty: totalQtyInBase / Number(conversion.factor),
					uomCode: d.uomCode,
				};
			}
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
			breakdown, // Optional: e.g., [{uomCode:"PK", qty:3}, {uomCode:"EA", qty:4}]
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
