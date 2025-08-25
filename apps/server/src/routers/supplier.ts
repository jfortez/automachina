import { db } from "@/db";
import { suppliers } from "@/db/schema/suppliers";
import { publicProcedure, router } from "@/lib/trpc";

export const supplierRouter = router({
	getAll: publicProcedure.query(async () => {
		const allSuppliers = await db.select().from(suppliers);
		return allSuppliers;
	}),
});
