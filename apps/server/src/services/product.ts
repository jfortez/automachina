import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productImages, products } from "@/db/schema/products";
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

const createProduct = async (data: CreateProductInput) => {
	const { images, ...productData } = data;
	const newProduct = await db.insert(products).values(productData).returning();
	if (images) {
		await db.insert(productImages).values(
			images.map((image) => ({
				productId: newProduct[0].id,
				url: image,
			})),
		);
	}
	return newProduct;
};

export {
	getAllProducts,
	getProductById,
	createProduct,
	getProductsByOrg,
	getProductCategories,
	getProductIdentifiers,
};
