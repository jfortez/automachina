import { cn } from "@/lib/utils";
import { Spinner } from "./ui/spinner";

const DefaultLoader = ({ className }: { className?: string }) => {
	return (
		<div
			className={cn(
				"flex h-dvh items-center justify-center bg-background",
				className,
			)}
		>
			<Spinner className="size-6" />
		</div>
	);
};

export default DefaultLoader;
