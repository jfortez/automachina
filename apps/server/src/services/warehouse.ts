import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organization } from "@/db/schema/auth";
import { locations, warehouses } from "@/db/schema/warehouse";
import type {
	CreateWarehouseInput,
	CreateWarehouseLocationInput,
} from "@/dto/warehouse";

const getWarehouses = async () => {
	const allWarehouses = await db.select().from(warehouses);
	return allWarehouses;
};

const getWarehousesLocation = async () => {
	const wLocations = await db.select().from(locations);
	return wLocations;
};

const getWarehouseByOrg = async (orgId: string) => {
	const warehousesByOrg = await db
		.select()
		.from(warehouses)
		.innerJoin(organization, eq(warehouses.organizationId, organization.id))
		.where(eq(warehouses.organizationId, orgId));

	if (!warehousesByOrg[0])
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Warehouse not found",
		});

	return warehousesByOrg;
};

const getWarehouseLocationsByOrg = async (orgId: string) => {
	const warehouseLocationsByOrg = await db
		.select()
		.from(locations)
		.innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
		.innerJoin(organization, eq(warehouses.organizationId, organization.id))
		.where(eq(warehouses.organizationId, orgId));
	return warehouseLocationsByOrg;
};

const createWarehouse = async (data: CreateWarehouseInput) => {
	const newWarehouse = await db.insert(warehouses).values(data).returning();
	return newWarehouse;
};

const createWarehouseLocation = async (data: CreateWarehouseLocationInput) => {
	const newLocation = await db.insert(locations).values(data).returning();
	return newLocation;
};

export {
	getWarehouses,
	getWarehousesLocation,
	getWarehouseByOrg,
	getWarehouseLocationsByOrg,
	createWarehouse,
	createWarehouseLocation,
};
