import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveOrganization } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
export const Route = createFileRoute("/_auth/invoice/")({
	component: InvoicePage,
});

function InvoicePage() {
	const { data: activeOrg } = useActiveOrganization();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const client = useQueryClient();

	const queryOptions = trpc.invoice.list.queryOptions(
		{
			organizationId: activeOrg?.id ?? "",
			page: 1,
			limit: 50,
		},
		{
			enabled: !!activeOrg?.id,
		},
	);

	const { data: invoicesData, isLoading } = useQuery(queryOptions);

	const invoices = invoicesData?.invoices;

	return (
		<div className="space-y-6 p-6">
			<div className="flex items-center justify-between">
				<h1 className="font-bold text-2xl tracking-tight">Invoices</h1>
				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="mr-2 h-4 w-4" />
							Generate Invoice
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[500px]">
						<DialogHeader>
							<DialogTitle>Generate Invoice from Order</DialogTitle>
						</DialogHeader>
						{activeOrg?.id && (
							<GenerateInvoiceForm
								orgId={activeOrg.id}
								onSuccess={() => {
									setIsDialogOpen(false);
									client.invalidateQueries({
										queryKey: queryOptions.queryKey,
									});
								}}
							/>
						)}
					</DialogContent>
				</Dialog>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Number</TableHead>
							<TableHead>Date</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Total</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center">
									Loading...
								</TableCell>
							</TableRow>
						) : invoices?.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center">
									No invoices found
								</TableCell>
							</TableRow>
						) : (
							invoices?.map((invoice) => (
								<TableRow key={invoice.id}>
									<TableCell className="font-medium">
										{invoice.invoiceNumber}
									</TableCell>
									<TableCell>
										{invoice.invoiceDate
											? format(new Date(invoice.invoiceDate), "PP")
											: "-"}
									</TableCell>
									<TableCell>
										<div className="capitalize">{invoice.status}</div>
									</TableCell>
									<TableCell>
										<div className="capitalize">{invoice.orderType}</div>
									</TableCell>
									<TableCell>
										{invoice.currency} {Number(invoice.totalAmount).toFixed(2)}
									</TableCell>
									<TableCell className="text-right">
										<Button variant="ghost" size="sm">
											<FileText className="h-4 w-4" />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

function GenerateInvoiceForm({
	orgId,
	onSuccess,
}: {
	orgId: string;
	onSuccess: () => void;
}) {
	const [orderType, setOrderType] = useState<"sales" | "purchase">("sales");

	const { data: salesOrders } = useQuery(
		trpc.order.sales.list.queryOptions(
			{
				organizationId: orgId,
				status: "fulfilled",
			},
			{
				enabled: orderType === "sales",
			},
		),
	);

	const { data: purchaseOrders } = useQuery(
		trpc.order.purchase.list.queryOptions(
			{
				organizationId: orgId,
				status: "received",
			},
			{
				enabled: orderType === "purchase",
			},
		),
	);

	const mutation = useMutation(
		trpc.invoice.generateFromOrder.mutationOptions({
			onSuccess: () => {
				toast.success("Invoice generated successfully");
				onSuccess();
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const form = useForm({
		defaultValues: {
			orderId: "",
		},
		onSubmit: async ({ value }) => {
			if (!value.orderId) {
				toast.error("Please select an order");
				return;
			}
			await mutation.mutateAsync({
				orderId: value.orderId,
				orderType: orderType,
			});
		},
	});

	const orders =
		orderType === "sales" ? salesOrders?.orders : purchaseOrders?.orders;

	return (
		<div className="space-y-4">
			<Tabs
				value={orderType}
				onValueChange={(v) => setOrderType(v as "sales" | "purchase")}
			>
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="sales">Sales Orders</TabsTrigger>
					<TabsTrigger value="purchase">Purchase Orders</TabsTrigger>
				</TabsList>
			</Tabs>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-4"
			>
				<form.Field name="orderId">
					{(field) => (
						<div className="space-y-2">
							<Label>Select Order</Label>
							<Select
								value={field.state.value}
								onValueChange={(val) => field.handleChange(val)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select an order..." />
								</SelectTrigger>
								<SelectContent>
									{orders?.length === 0 ? (
										<SelectItem value="none" disabled>
											No eligible orders found
										</SelectItem>
									) : (
										orders?.map((order) => (
											<SelectItem key={order.id} value={order.id}>
												{order.orderNumber || order.id.slice(0, 8)} -{" "}
												{format(new Date(order.createdAt), "PP")}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>
					)}
				</form.Field>

				<div className="flex justify-end pt-4">
					<Button type="submit" disabled={mutation.isPending}>
						{mutation.isPending ? "Generating..." : "Generate Invoice"}
					</Button>
				</div>
			</form>
		</div>
	);
}
