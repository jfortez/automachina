import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import FormKit, { type FieldKit } from "@/components/form-kit";
import { productSheet } from "@/lib/hub-factory";
import { trpc } from "@/lib/trpc";

const hoc = productSheet.hoc;

const formSchema = z.object({
	sku: z.string().min(6, "SKU is required").default(""),
	name: z.string().min(1, "Name is required").default(""),
	uom: z.string().min(1, "UOM is required").default(""),
	description: z.string().default(""),
});

const fields: FieldKit<typeof formSchema>[] = [
	{
		name: "sku",
		label: "SKU",
		description: "SKU is Required",
		size: 6,
		type: "text",
		placeholder: "123456",
	},
	{
		type: "fill",
	},
	{
		name: "name",
		label: "Product Name",
		description: "Name is required",
		type: "text",
		size: 8,
		placeholder: "Apple",
	},
	{
		name: "uom",
		label: "UOM",
		description: "Select a UOM",
		type: "text",
		size: 4,
		placeholder: "kg",
	},
	{
		name: "description",
		label: "Product Description",
		type: "textarea",
		placeholder: "This is a product description",
	},
];

const ProductForm = hoc(() => {
	const { mutate } = useMutation(trpc.product.create.mutationOptions());

	const handleSubmit = async (values: z.core.input<typeof formSchema>) => {
		mutate(values);
	};
	return (
		<FormKit schema={formSchema} fields={fields} onSubmit={handleSubmit} />
	);
});

export default ProductForm;
