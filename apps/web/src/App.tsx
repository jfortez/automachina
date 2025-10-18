import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import AuthProvider, { useAuth } from "@/components/auth-provider";

import { queryClient, trpc } from "./lib/trpc";
import { router } from "./router";

const InnerApp = () => {
	const auth = useAuth();

	return (
		<RouterProvider router={router} context={{ auth, trpc, queryClient }} />
	);
};

export const App = () => {
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<InnerApp />
			</AuthProvider>
		</QueryClientProvider>
	);
};
