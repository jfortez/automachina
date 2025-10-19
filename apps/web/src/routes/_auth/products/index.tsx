import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { Column, ColumnDef } from "@tanstack/react-table";
import {
	CheckCircle,
	CheckCircle2,
	DollarSign,
	MoreHorizontal,
	Text,
	XCircle,
} from "lucide-react";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

	console.log(data[0]);

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
				header: "name",
				enableColumnFilter: true,
			},
			{
				id: "baseUom",
				accessorKey: "baseUom",
				header: "baseUom",
				enableColumnFilter: true,
			},
			{
				id: "isPhysical",
				accessorKey: "isPhysical",
				header: "isPhysical",
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
				<DataTableToolbar table={table} />
			</DataTable>
		</div>
	);
}
