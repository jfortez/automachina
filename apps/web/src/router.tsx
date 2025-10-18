import { createRouter } from "@tanstack/react-router";
import { Spinner } from "@/components/ui/spinner";
import { queryClient, trpc } from "./lib/trpc";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultPendingComponent: () => <Spinner />,
	context: { trpc, queryClient, auth: undefined! },
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
