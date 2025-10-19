import { useAuth } from "./auth-provider";
import { Spinner } from "./ui/spinner";

const AuthFallback = ({ children }: { children: React.ReactNode }) => {
	const { isPending } = useAuth();
	if (isPending)
		return (
			<div className="flex h-dvh items-center justify-center bg-background">
				<Spinner className="size-6" />
			</div>
		);

	return children;
};

export default AuthFallback;
