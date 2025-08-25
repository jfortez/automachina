import { db } from "@/db";
import { suppliers } from "@/db/schema/suppliers";

const getSuppliers = async () => {
	const allSuppliers = await db.select().from(suppliers);
	return allSuppliers;
};

export { getSuppliers };
