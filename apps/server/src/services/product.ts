import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
	productCategory,
	productImages,
	product as productTable,
	productUom,
} from "@/db/schema/products";
import type {
	CreateProductCategoryInput,
	CreateProductInput,
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
		const [createdProduct] = await tx
			.insert(productTable)
			.values({
				organizationId: d.organizationId,
				sku: d.sku,
				name: d.name,
				description: d.description,
				categoryId: d.categoryId,
				baseUom: d.baseUom,
				trackingLevel: "none",
				attributes: d.attributes,
			})
			.returning();
		const prodId = createdProduct.id;
		if (d.productUoms) {
			await Promise.all(
				d.productUoms.map(async (pu) => {
					await tx.insert(productUom).values({
						productId: prodId,
						uomCode: pu.uomCode,
						qtyInBase: pu.qtyInBase,
					});
				}),
			);
		}

		if (d.images) {
			await Promise.all(
				d.images.map(async (img) => {
					await tx.insert(productImages).values({
						productId: prodId,
						...img,
					});
				}),
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
