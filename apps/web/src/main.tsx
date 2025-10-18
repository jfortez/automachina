import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import AuthProvider, { useAuth } from "@/components/auth-provider";
import { Spinner } from "@/components/ui/spinner";
import { queryClient, trpc } from "./lib/trpc";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
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

const InnerApp = () => {
	const auth = useAuth();

	return <RouterProvider router={router} context={{ auth }} />;
};

const App = () => {
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<InnerApp />
			</AuthProvider>
		</QueryClientProvider>
	);
};

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<App />);
}
