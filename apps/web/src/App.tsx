import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import AuthProvider, { useAuth } from "@/components/auth-provider";
import AuthFallback from "./components/auth-fallback";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/sonner";
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
		<ThemeProvider
			attribute="class"
			defaultTheme="dark"
			disableTransitionOnChange
			storageKey="app-theme"
		>
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					<AuthFallback>
						<InnerApp />
					</AuthFallback>
				</AuthProvider>
			</QueryClientProvider>
			<Toaster richColors closeButton />
		</ThemeProvider>
	);
};
