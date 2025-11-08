import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";
import * as React from "react";
import { z } from "zod";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { FormKit } from "@/components/form-kit";
import {
	Field,
	FieldControl,
	FieldDescription,
	FieldError,
	FieldLabel,
	Form,
} from "@/components/form-kit/form";
import { useAppForm } from "@/components/form-kit/form-hook";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { useDataTable } from "@/hooks/use-data-table";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/_auth/products/")({
	component: RouteComponent,
	loader: async ({ context: { trpc, queryClient } }) => {
		await queryClient.ensureQueryData(trpc.product.getAll.queryOptions());
		return;
	},
});

type Product = (typeof trpc.product.getAll)["~types"]["output"][0];

function RouteComponent() {
	const { data = [] } = useQuery(trpc.product.getAll.queryOptions());
	// const form = useAppForm({
	//   defaultValues: {
	//     foo: "/",
	//     baz: "weaboo",
	//   },
	//   validators: {
	//     onChange: z.object({
	//       foo: z.string().min(1, "Name is required"),
	//       baz: z.string().min(1, "Name is required"),
	//     }),
	//   },
	// });

	const columns = React.useMemo<ColumnDef<Product>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() ||
							(table.getIsSomePageRowsSelected() && "indeterminate")
						}
						onCheckedChange={(value) =>
							table.toggleAllPageRowsSelected(!!value)
						}
						aria-label="Select all"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label="Select row"
					/>
				),
				size: 32,
				enableSorting: false,
				enableHiding: false,
			},
			{
				id: "sku",
				accessorKey: "sku",
				header: "sku",
				enableColumnFilter: true,
			},
			{
				id: "name",
				accessorKey: "name",
				header: "Name",
				enableColumnFilter: true,
			},
			{
				id: "baseUom",
				accessorKey: "baseUom",
				header: "UOM",
				enableColumnFilter: true,
			},
			{
				id: "isPhysical",
				accessorKey: "isPhysical",
				header: "Is Physical",
				enableColumnFilter: true,
				cell: ({ row }) => (
					<Checkbox checked={row.original.isPhysical} disabled />
				),
			},
			{
				id: "organization",
				accessorKey: "organization.name",
				header: "Organization",
				enableColumnFilter: true,
			},

			{
				id: "actions",
				cell: function Cell() {
					return (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon">
									<MoreHorizontal className="h-4 w-4" />
									<span className="sr-only">Open menu</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem>Edit</DropdownMenuItem>
								<DropdownMenuItem variant="destructive">
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					);
				},
				size: 32,
			},
		],
		[],
	);

	const { table } = useDataTable({
		data: data,
		columns,
		pageCount: 1,

		getRowId: (row) => row.id,
	});

	return (
		<div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
			<DataTable table={table}>
				<div className="flex items-center justify-between">
					<Sheet>
						<SheetTrigger asChild>
							<Button size="icon">
								<Plus className="h-4 w-4" />
								<span className="sr-only">Add product</span>
							</Button>
						</SheetTrigger>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>Add Product</SheetTitle>
								<SheetDescription>
									Add a new product to the store.
								</SheetDescription>
							</SheetHeader>
							<div className="p-4">
								<div className="space-y-2">
									<FormKit
										schema={z.object({
											foo: z.string().min(1, "Name is required"),
										})}
										initialValues={{ foo: "cabrones" }}
									/>
									{/* <form.AppForm>
                    <Form>
                      <form.AppField name="foo">
                        {(field) => {
                          console.log({ field });
                          return (
                            <Field>
                              <FieldLabel>Name</FieldLabel>
                              <FieldControl>
                                <Input
                                  type="text"
                                  placeholder="Enter your name"
                                  value={field.state.value}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  onBlur={field.handleBlur}
                                />
                              </FieldControl>
                              <FieldDescription>Enter your name</FieldDescription>
                              <FieldError />
                            </Field>
                          );
                        }}
                      </form.AppField>
                    </Form>
                    <form.Subscribe
                      selector={(state) => ({
                        canSubmit: state.canSubmit,
                        isSubmitted: state.isSubmitted,
                      })}
                    >
                      {({ canSubmit, isSubmitted }) => {
                        return (
                          <Button disabled={!canSubmit}>
                            {isSubmitted ? "Submitting..." : "Submit"}
                          </Button>
                        );
                      }}
                    </form.Subscribe>
                  </form.AppForm> */}
								</div>
							</div>
							<SheetFooter>
								<Button type="submit">Add Product</Button>
								<Button variant="ghost">Cancel</Button>
							</SheetFooter>
						</SheetContent>
					</Sheet>
					<DataTableToolbar table={table} />
				</div>
			</DataTable>
		</div>
	);
}
