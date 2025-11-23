import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/components/auth-provider";
import FormKit, { type FieldKit } from "@/components/form-kit";
import { productSheet } from "@/lib/hub-factory";
import { trpc } from "@/lib/trpc";

const hoc = productSheet.hoc;

const productPrice = z.object({
	priceListId: z.string().optional(), // Link to priceList (e.g., 'public' or 'wholesale')
	customerId: z.string().optional(), // Customer-specific pricing
	uomCode: z.string().min(1),
	price: z.number().min(0),
	currency: z.string().default("USD"),
	minQty: z.number().positive().default(1),
	effectiveFrom: z.date().optional(),
	effectiveTo: z.date().optional(),
});

const formSchema = z.object({
	// organizationId: z.string(),
	sku: z.string().min(1).default(""),
	name: z.string().min(1).default(""),
	description: z.string().optional().default(""),
	categoryId: z.string().default("general"),
	images: z.array(z.any()).optional(),
	baseUom: z.string().min(1).default("EA"),
	trackingLevel: z
		.enum(["none", "lot", "serial", "lot+serial"])
		.default("none"),
	// attributes: recordSchema.optional(), //FOR LLM/ Semantic Search eg. Store tags, labels, colors, weights, etc. as JSON (e.g., { tags: ["Plomeria", "Roscable"], sizeOptions: ["1/2", "3/4"] })
	perishable: z.boolean().default(false),
	shelfLifeDays: z.number().int().positive().optional(),
	// productUoms: z.array(productUom).optional(),
	isPhysical: z.boolean().default(true),
	productFamilyId: z.string().optional(), // Link to family for variations (e.g., different sizes of the same product)
	suggestedRetailPrice: z.string().optional(), // Base suggested price (in base UoM)
	defaultCost: z.string().optional(),
	defaultCurrency: z.string().default("USD"),
	prices: z.array(productPrice).optional(),
	// identifiers: z.array(productIdentifier).optional(), // For external IDs, useful for packages in CASE 2
});

const ProductForm = hoc(() => {
	const { mutate } = useMutation(trpc.product.create.mutationOptions());
	const { session } = useAuth();

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
			name: "baseUom",
			label: "UOM",
			description: "Select a UOM",
			type: "select",
			size: 4,
			placeholder: "kg",
			fieldProps: {
				queryOptions: trpc.uom.getAll.queryOptions(),
				field: {
					text: "name",
					value: "code",
				},
			},
		},
		{
			name: "categoryId",
			label: "Category",
			description: "Select a Category",
			type: "select",
			size: 6,
			placeholder: "kg",
			fieldProps: {
				queryOptions: trpc.product.category.getAllByOrg.queryOptions(
					session!.activeOrganizationId!,
				),
				field: {
					text: "name",
					value: "code",
				},
			},
		},
		{
			name: "description",
			label: "Product Description",
			type: "textarea",
			placeholder: "This is a product description",
		},
	];

	const handleSubmit = async (values: z.core.output<typeof formSchema>) => {
		// const input: (typeof trpc.product.create)["~types"]["input"] = {
		//   sku: values.sku,
		//   name: values.name,
		//   description: values.description,
		//   baseUom: values.uom,
		// };

		mutate(values);
	};
	return (
		<FormKit schema={formSchema} fields={fields} onSubmit={handleSubmit} />
	);
});

export default ProductForm;
