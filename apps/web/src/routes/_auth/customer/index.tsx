import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/_auth/customer/")({
	component: CustomerPage,
});

function CustomerPage() {
	const { data: customers, isLoading } = useQuery(
		trpc.customer.getAll.queryOptions(),
	);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const client = useQueryClient();

	const createCustomerMutation = useMutation(
		trpc.customer.create.mutationOptions({
			onSuccess: () => {
				toast.success("Customer created successfully");
				setIsDialogOpen(false);
				client.invalidateQueries({ queryKey: trpc.customer.getAll.queryKey() });
			},
			onError: (error) => {
				toast.error(`Error creating customer: ${error.message}`);
			},
		}),
	);

	const form = useForm({
		defaultValues: {
			name: "",
			code: "",
		},
		onSubmit: async ({ value }) => {
			await createCustomerMutation.mutateAsync({
				name: value.name,
				code: value.code,
			});
		},
	});

	return (
		<div className="space-y-6 p-6">
			<div className="flex items-center justify-between">
				<h1 className="font-bold text-2xl tracking-tight">Customers</h1>
				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="mr-2 h-4 w-4" />
							Add Customer
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create Customer</DialogTitle>
						</DialogHeader>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								form.handleSubmit();
							}}
							className="space-y-4"
						>
							<form.Field
								name="name"
								validators={{
									onChange: ({ value }) =>
										!value ? "Name is required" : undefined,
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Name</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors ? (
											<p className="text-red-500 text-sm">
												{field.state.meta.errors.join(", ")}
											</p>
										) : null}
									</div>
								)}
							</form.Field>
							<form.Field
								name="code"
								validators={{
									onChange: ({ value }) =>
										!value ? "Code is required" : undefined,
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Code</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors ? (
											<p className="text-red-500 text-sm">
												{field.state.meta.errors.join(", ")}
											</p>
										) : null}
									</div>
								)}
							</form.Field>
							<div className="flex justify-end pt-4">
								<Button
									type="submit"
									disabled={createCustomerMutation.isPending}
								>
									{createCustomerMutation.isPending ? "Creating..." : "Create"}
								</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Code</TableHead>
							<TableHead>ID</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={3} className="text-center">
									Loading...
								</TableCell>
							</TableRow>
						) : customers?.length === 0 ? (
							<TableRow>
								<TableCell colSpan={3} className="text-center">
									No customers found
								</TableCell>
							</TableRow>
						) : (
							customers?.map((customer) => (
								<TableRow key={customer.id}>
									<TableCell>{customer.name}</TableCell>
									<TableCell>{customer.code}</TableCell>
									<TableCell className="font-mono text-muted-foreground text-xs">
										{customer.id}
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
