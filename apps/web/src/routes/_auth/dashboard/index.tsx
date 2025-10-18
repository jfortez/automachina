import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/_auth/dashboard/")({
	component: RouteComponent,
});

function RouteComponent() {
	const privateData = useQuery(trpc.privateData.queryOptions());

	return (
		<div>
			<h1>Dashboard</h1>
			<p>privateData: {privateData.data?.message}</p>
		</div>
	);
}
