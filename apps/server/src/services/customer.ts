import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema/customer";
import type { CreateCustomerInput, UpdateCustomerInput } from "@/dto/customer";

const getAllCustomers = async () => {
	const customers = await db.query.customers.findMany();
	return customers;
};

const getCustomerById = async (id: string) => {
	const customer = await db.query.customers.findFirst({
		where: eq(customers.id, id),
	});
	return customer;
};

const createCustomer = async (
	data: CreateCustomerInput,
	organizationId: string,
) => {
	const customer = await db
		.insert(customers)
		.values({ ...data, organizationId })
		.returning();
	return customer;
};

const updateCustomer = async ({ id, ...data }: UpdateCustomerInput) => {
	const customer = await db
		.update(customers)
		.set(data)
		.where(eq(customers.id, id))
		.returning();
	return customer;
};

const deleteCustomer = async (id: string) => {
	const customer = await db
		.delete(customers)
		.where(eq(customers.id, id))
		.returning();
	return customer;
};

export {
	getAllCustomers,
	createCustomer,
	updateCustomer,
	deleteCustomer,
	getCustomerById,
};
