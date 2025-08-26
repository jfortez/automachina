import { eq } from "drizzle-orm";
import { db } from "@/db";
import { uom } from "@/db/schema/uom";

const getAllUom = async () => {
	const allUom = await db.query.uom.findMany();
	return allUom;
};

const getUomByCode = async (code: string) => {
	const uomItem = await db.query.uom.findFirst({
		where: eq(uom.code, code),
	});
	return uomItem;
};

export { getAllUom, getUomByCode };
