import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowDownToLine,
	MoreHorizontal,
	RefreshCw,
	ShoppingCart,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { useActiveOrganization } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/_auth/inventory/")({
	component: InventoryPage,
});

function InventoryPage() {
	const { data: activeOrg } = useActiveOrganization();
	const client = useQueryClient();
	const { data: products, isLoading } = useQuery(
		trpc.product.getByOrg.queryOptions(activeOrg?.id ?? "", {
			enabled: !!activeOrg?.id,
		}),
	);

	// State for dialogs
	const [selectedProduct, setSelectedProduct] = useState<any>(null);
	const [actionType, setActionType] = useState<
		"receive" | "sell" | "adjust" | null
	>(null);

	const closeDialog = () => {
		setSelectedProduct(null);
		setActionType(null);
	};

	return (
		<div className="space-y-6 p-6">
			<div className="flex items-center justify-between">
				<h1 className="font-bold text-2xl tracking-tight">Inventory</h1>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>SKU</TableHead>
							<TableHead>Name</TableHead>
							<TableHead>Category</TableHead>
							<TableHead>Base UOM</TableHead>
							<TableHead className="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={5} className="text-center">
									Loading...
								</TableCell>
							</TableRow>
						) : products?.length === 0 ? (
							<TableRow>
								<TableCell colSpan={5} className="text-center">
									No products found
								</TableCell>
							</TableRow>
						) : (
							products?.map((product) => (
								<TableRow key={product.id}>
									<TableCell>{product.sku}</TableCell>
									<TableCell>{product.name}</TableCell>
									<TableCell>{product.category?.name ?? "-"}</TableCell>
									<TableCell>{product.baseUom}</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" className="h-8 w-8 p-0">
													<span className="sr-only">Open menu</span>
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuLabel>Actions</DropdownMenuLabel>
												<DropdownMenuItem
													onClick={() => {
														setSelectedProduct(product);
														setActionType("receive");
													}}
												>
													<ArrowDownToLine className="mr-2 h-4 w-4" />
													Receive
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => {
														setSelectedProduct(product);
														setActionType("sell");
													}}
												>
													<ShoppingCart className="mr-2 h-4 w-4" />
													Sell
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => {
														setSelectedProduct(product);
														setActionType("adjust");
													}}
												>
													<RefreshCw className="mr-2 h-4 w-4" />
													Adjust
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Action Dialogs */}
			<Dialog
				open={!!selectedProduct}
				onOpenChange={(open) => !open && closeDialog()}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{actionType === "receive" && "Receive Inventory"}
							{actionType === "sell" && "Sell Product"}
							{actionType === "adjust" && "Adjust Inventory"}
							{selectedProduct && ` - ${selectedProduct.name}`}
						</DialogTitle>
					</DialogHeader>
					{selectedProduct && actionType === "receive" && (
						<ReceiveForm
							product={selectedProduct}
							orgId={activeOrg?.id!}
							onSuccess={() => {
								closeDialog();
								client.invalidateQueries({
									queryKey: trpc.product.getByOrg.queryKey(activeOrg?.id),
								});
							}}
						/>
					)}
					{selectedProduct && actionType === "sell" && (
						<SellForm
							product={selectedProduct}
							orgId={activeOrg?.id!}
							onSuccess={() => {
								closeDialog();
							}}
						/>
					)}
					{selectedProduct && actionType === "adjust" && (
						<AdjustForm
							product={selectedProduct}
							orgId={activeOrg?.id!}
							onSuccess={() => {
								closeDialog();
							}}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

function ReceiveForm({
	product,
	orgId,
	onSuccess,
}: {
	product: any;
	orgId: string;
	onSuccess: () => void;
}) {
	const mutation = useMutation(
		trpc.inventory.receive.mutationOptions({
			onSuccess: () => {
				toast.success("Inventory received");
				onSuccess();
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const form = useForm({
		defaultValues: {
			qty: 1,
			cost: 0,
			uomCode: product.baseUom,
		},
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync({
				organizationId: orgId,
				productId: product.id,
				qty: Number(value.qty),
				cost: Number(value.cost),
				uomCode: value.uomCode,
			});
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<form.Field name="qty">
				{(field) => (
					<div className="space-y-2">
						<Label>Quantity</Label>
						<Input
							type="number"
							value={field.state.value}
							onChange={(e) => field.handleChange(Number(e.target.value))}
						/>
					</div>
				)}
			</form.Field>
			<form.Field name="cost">
				{(field) => (
					<div className="space-y-2">
						<Label>Unit Cost</Label>
						<Input
							type="number"
							value={field.state.value}
							onChange={(e) => field.handleChange(Number(e.target.value))}
						/>
					</div>
				)}
			</form.Field>
			<div className="flex justify-end pt-4">
				<Button type="submit" disabled={mutation.isPending}>
					{mutation.isPending ? "Processing..." : "Receive"}
				</Button>
			</div>
		</form>
	);
}

function SellForm({
	product,
	orgId,
	onSuccess,
}: {
	product: any;
	orgId: string;
	onSuccess: () => void;
}) {
	const mutation = useMutation(
		trpc.inventory.sell.mutationOptions({
			onSuccess: () => {
				toast.success("Product sold");
				onSuccess();
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const form = useForm({
		defaultValues: {
			qty: 1,
			uomCode: product.baseUom,
		},
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync({
				organizationId: orgId,
				productId: product.id,
				lines: [{ qty: Number(value.qty), uomCode: value.uomCode }],
			});
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<form.Field name="qty">
				{(field) => (
					<div className="space-y-2">
						<Label>Quantity</Label>
						<Input
							type="number"
							value={field.state.value}
							onChange={(e) => field.handleChange(Number(e.target.value))}
						/>
					</div>
				)}
			</form.Field>
			<div className="flex justify-end pt-4">
				<Button type="submit" disabled={mutation.isPending}>
					{mutation.isPending ? "Processing..." : "Sell"}
				</Button>
			</div>
		</form>
	);
}

function AdjustForm({
	product,
	orgId,
	onSuccess,
}: {
	product: any;
	orgId: string;
	onSuccess: () => void;
}) {
	const mutation = useMutation(
		trpc.inventory.adjust.mutationOptions({
			onSuccess: () => {
				toast.success("Inventory adjusted");
				onSuccess();
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const form = useForm({
		defaultValues: {
			qty: 1,
			type: "pos" as "pos" | "neg",
			reason: "",
			uomCode: product.baseUom,
		},
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync({
				organizationId: orgId,
				productId: product.id,
				warehouseId: "default", // Assuming default warehouse for now
				qty: Number(value.qty),
				adjustmentType: value.type,
				reason: value.reason,
				uomCode: value.uomCode,
			});
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<form.Field name="type">
				{(field) => (
					<div className="space-y-2">
						<Label>Type</Label>
						<Select
							value={field.state.value}
							onValueChange={(val: "pos" | "neg") => field.handleChange(val)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="pos">Positive (+)</SelectItem>
								<SelectItem value="neg">Negative (-)</SelectItem>
							</SelectContent>
						</Select>
					</div>
				)}
			</form.Field>
			<form.Field name="qty">
				{(field) => (
					<div className="space-y-2">
						<Label>Quantity</Label>
						<Input
							type="number"
							value={field.state.value}
							onChange={(e) => field.handleChange(Number(e.target.value))}
						/>
					</div>
				)}
			</form.Field>
			<form.Field name="reason">
				{(field) => (
					<div className="space-y-2">
						<Label>Reason</Label>
						<Input
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="e.g., Damage, Theft, Count"
						/>
					</div>
				)}
			</form.Field>
			<div className="flex justify-end pt-4">
				<Button type="submit" disabled={mutation.isPending}>
					{mutation.isPending ? "Processing..." : "Adjust"}
				</Button>
			</div>
		</form>
	);
}
