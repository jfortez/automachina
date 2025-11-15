import { z } from "zod";
import FormKit, { type FieldKit } from "@/components/form-kit";
import { productSheet } from "@/lib/hub-factory";

const hoc = productSheet.hoc;

const formSchema = z.object({
	sku: z.string().min(6, "SKU is required").default(""),
	name: z.string().min(1, "Name is required").default(""),
	uom: z.string().min(1, "UOM is required").default(""),
});

const fields: FieldKit<typeof formSchema>[] = [
	{
		name: "sku",
		label: "SKU",
		description: "SKU is Required",
		size: 12,
		type: "text",
		placeholder: "123456",
	},
	{
		name: "name",
		label: "Product Name",
		description: "Name is required",
		type: "text",
		size: 6,
		placeholder: "Apple",
	},
	{
		name: "uom",
		label: "UOM",
		description: "Select a UOM",
		type: "text",
		size: 6,
		placeholder: "kg",
	},
];

const ProductForm = hoc(() => {
	return <FormKit schema={formSchema} fields={fields} />;
});

export default ProductForm;
