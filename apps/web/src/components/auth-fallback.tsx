import { useAuth } from "./auth-provider";
import DefaultLoader from "./default-loader";

const AuthFallback = ({ children }: { children: React.ReactNode }) => {
	const { isPending } = useAuth();
	if (isPending) return <DefaultLoader />;

	return children;
};

export default AuthFallback;
