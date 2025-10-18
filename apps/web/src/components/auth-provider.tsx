import { createContext, useContext, useMemo } from "react";

import { type User, useSession } from "@/lib/auth-client";

export type AuthContext = {
	user: User | null;
	isAuthenticated: boolean;
	isPending: boolean;
};

const AuthCtx = createContext<AuthContext | undefined>(undefined);

type AuthProviderProps = {
	children: React.ReactNode;
};

export const useAuth = () => {
	const ctx = useContext(AuthCtx);
	if (!ctx) throw new Error("Auth context not found");
	return ctx;
};

const AuthProvider = ({ children }: AuthProviderProps) => {
	const { data, isPending } = useSession();

	const value = useMemo<AuthContext>(() => {
		return {
			user: data?.user || null,
			isAuthenticated: !isPending && !!data,
			isPending,
		};
	}, [data, isPending]);

	return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export default AuthProvider;
