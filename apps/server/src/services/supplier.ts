import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { supplierProducts, suppliers } from "@/db/schema/suppliers";
import type {
	CreateSupplierInput,
	CreateSupplierProductInput,
	UpdateSupplierInput,
	UpdateSupplierProductInput,
} from "@/dto/supplier";

// === SUPPLIERS ===

const getAllSuppliers = async () => {
	const allSuppliers = await db.select().from(suppliers);
	return allSuppliers;
};

const getSupplierById = async (id: string) => {
	const supplier = await db.query.suppliers.findFirst({
		where: eq(suppliers.id, id),
	});
	return supplier;
};

const getSuppliersByOrg = async (organizationId: string) => {
	const suppliersList = await db.query.suppliers.findMany({
		where: eq(suppliers.organizationId, organizationId),
	});
	return suppliersList;
};

const createSupplier = async (data: CreateSupplierInput) => {
	const supplier = await db.insert(suppliers).values(data).returning();
	return supplier;
};

const updateSupplier = async ({ id, ...data }: UpdateSupplierInput) => {
	const supplier = await db
		.update(suppliers)
		.set(data)
		.where(eq(suppliers.id, id))
		.returning();

	if (!supplier.length) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });
	}

	return supplier;
};

const deleteSupplier = async (id: string) => {
	const supplier = await db
		.delete(suppliers)
		.where(eq(suppliers.id, id))
		.returning();

	if (!supplier.length) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });
	}

	return supplier;
};

// === SUPPLIER PRODUCTS ===

const getSupplierProducts = async (supplierId: string) => {
	const supplierProductList = await db.query.supplierProducts.findMany({
		where: eq(supplierProducts.supplierId, supplierId),
	});
	return supplierProductList;
};

const createSupplierProduct = async (data: CreateSupplierProductInput) => {
	const supplierProduct = await db
		.insert(supplierProducts)
		.values(data)
		.returning();
	return supplierProduct;
};

const updateSupplierProduct = async ({
	id,
	...data
}: UpdateSupplierProductInput) => {
	const supplierProduct = await db
		.update(supplierProducts)
		.set(data)
		.where(eq(supplierProducts.id, id))
		.returning();

	if (!supplierProduct.length) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Supplier product not found",
		});
	}

	return supplierProduct;
};

const deleteSupplierProduct = async (id: string) => {
	const supplierProduct = await db
		.delete(supplierProducts)
		.where(eq(supplierProducts.id, id))
		.returning();

	if (!supplierProduct.length) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Supplier product not found",
		});
	}

	return supplierProduct;
};

export {
	getAllSuppliers,
	getSupplierById,
	getSuppliersByOrg,
	createSupplier,
	updateSupplier,
	deleteSupplier,
	getSupplierProducts,
	createSupplierProduct,
	updateSupplierProduct,
	deleteSupplierProduct,
};
