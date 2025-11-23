import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useDataTable } from "@/hooks/use-data-table";
import { productSheet } from "@/lib/hub-factory";
import { trpc } from "@/lib/trpc";
import ProductForm from "./-components/product-form";
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
								<productSheet.trigger before={(store) => store.setMode("edit")}>
									<DropdownMenuItem>Edit</DropdownMenuItem>
								</productSheet.trigger>
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
					<productSheet.trigger before={(store) => store.setMode("create")}>
						<Button size="icon">
							<Plus className="h-4 w-4" />
							<span className="sr-only">Add product</span>
						</Button>
					</productSheet.trigger>
					<ProductForm />
					<Select>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Select a fruit" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Fruits</SelectLabel>
								<SelectItem value="apple">Apple</SelectItem>
								<SelectItem value="banana">Banana</SelectItem>
								<SelectItem value="blueberry">Blueberry</SelectItem>
								<SelectItem value="grapes">Grapes</SelectItem>
								<SelectItem value="pineapple">Pineapple</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>

					<DataTableToolbar table={table} />
				</div>
			</DataTable>
		</div>
	);
}
