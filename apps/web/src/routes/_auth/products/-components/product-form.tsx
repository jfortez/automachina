import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
	organizationId: z.string().optional(), // Injected on submit
	sku: z.string().min(1).default(""),
	name: z.string().min(1).default(""),
	description: z.string().optional().default(""),
	categoryId: z.string().default(""),
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
	prices: z.array(productPrice).optional().default([]),
	// identifiers: z.array(productIdentifier).optional(), // For external IDs, useful for packages in CASE 2
});

const ProductForm = hoc(({ close }) => {
	const client = useQueryClient();
	const { mutateAsync } = useMutation(
		trpc.product.create.mutationOptions({
			onSettled: () => {
				client.invalidateQueries({ queryKey: trpc.product.getAll.queryKey() });
			},
			onSuccess: () => {
				toast.success("Product created successfully");
			},
		}),
	);
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
			placeholder: "General",
			fieldProps: {
				queryOptions: trpc.product.category.getAllByOrg.queryOptions(
					session!.activeOrganizationId!,
				),
				field: {
					text: "name",
					value: "id",
				},
			},
		},
		{
			name: "trackingLevel",
			label: "Tracking Level",
			type: "select",
			size: 6,
			fieldProps: {
				items: [
					{ id: "none", name: "None" },
					{ id: "lot", name: "Lot" },
					{ id: "serial", name: "Serial" },
					{ id: "lot+serial", name: "Lot + Serial" },
				],
			},
		},
		{
			name: "isPhysical",
			label: "Is Physical Product?",
			type: "checkbox",
			size: 4,
		},
		{
			name: "perishable",
			label: "Perishable?",
			type: "checkbox",
			size: 4,
		},
		{
			name: "shelfLifeDays",
			label: "Shelf Life (Days)",
			type: "number",
			size: 4,
		},
		{
			name: "suggestedRetailPrice",
			label: "Suggested Retail Price",
			type: "text",
			size: 4,
		},
		{
			name: "defaultCost",
			label: "Default Cost",
			type: "text",
			size: 4,
		},
		{
			name: "defaultCurrency",
			label: "Default Currency",
			type: "text",
			size: 4,
			placeholder: "USD",
		},
		{
			name: "productFamilyId",
			label: "Product Family ID",
			type: "text",
			size: 6,
		},
		{
			name: "description",
			label: "Product Description",
			type: "textarea",
			placeholder: "This is a product description",
			size: 12,
		},
		// {
		//   name: "prices",
		//   type: "priceRepeater", // Custom component
		//   size: 12,
		// },
	];

	const handleSubmit = async (values: z.core.output<typeof formSchema>) => {
		await mutateAsync({
			...values,
			prices: [],
			organizationId: session!.activeOrganizationId!,
		});
		close();
	};
	return (
		<FormKit
			schema={formSchema} /* fields={fields} onSubmit={handleSubmit}  */
			showSubmit
		/>
	);
});

export default ProductForm;
