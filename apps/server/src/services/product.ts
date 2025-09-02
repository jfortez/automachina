import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productImages, products, productUom } from "@/db/schema/products";
import type { CreateProductInput } from "@/dto/product";

const getAllProducts = async () => {
	const allProducts = await db.query.products.findMany({
		with: {
			category: true,
			images: true,
			organization: true,
		},
	});
	return allProducts;
};

const getProductById = async (id: string) => {
	const product = await db.query.products.findFirst({
		with: {
			category: true,
			images: true,
			organization: true,
		},
		where: eq(products.id, id),
	});
	return product;
};
const getProductsByOrg = async (orgId: string) => {
	const product = await db.query.products.findMany({
		with: {
			category: true,
			images: true,
			organization: true,
		},
		where: eq(products.organizationId, orgId),
	});
	return product;
};

const getProductCategories = async () => {
	const categories = await db.query.productCategories.findMany();
	return categories;
};

const getProductIdentifiers = async () => {
	const identifiers = await db.query.productIdentifiers.findMany();
	return identifiers;
};

const createProduct = async (d: CreateProductInput) => {
	return await db.transaction(async (tx) => {
		const [createdProduct] = await tx
			.insert(products)
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
		for (const pu of d.productUoms) {
			await db.insert(productUom).values({
				productId: prodId,
				uomCode: pu.uomCode,
				qtyInBase: pu.qtyInBase,
			});
		}

		if (d.images) {
			for (const img of d.images) {
				await db.insert(productImages).values({
					productId: prodId,
					...img,
				});
			}
		}
		return createdProduct;
	});
};

export {
	getAllProducts,
	getProductById,
	createProduct,
	getProductsByOrg,
	getProductCategories,
	getProductIdentifiers,
};
