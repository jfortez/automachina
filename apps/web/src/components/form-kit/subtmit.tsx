import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useFormContext } from "./form";

export type SubmitProps = {
	submitText?: string | ((isSubmitting: boolean) => string);
	cancelText?: string;
	showCancelButton?: boolean;
	className?: string;
	handleCancel?: () => void;
};
export const SubmitButton = ({
	cancelText = "Cancel",
	className,
	showCancelButton = true,
	submitText: _subtmitText,
	handleCancel: _handleCancel,
}: SubmitProps) => {
	const form = useFormContext();

	const getSubmitText = (isSubmitting: boolean) => {
		if (typeof _subtmitText === "function") {
			return _subtmitText(isSubmitting);
		}
		return _subtmitText || (isSubmitting ? "Saving..." : "Save Changes");
	};

	const submitText = (isSubmitting: boolean) => {
		return getSubmitText(isSubmitting);
	};

	const handleCancel = () => {
		form.reset();
		_handleCancel?.();
	};

	return (
		<form.Subscribe
			selector={(state) => ({
				isSubmitting: state.isSubmitting,
				canSubmit: state.canSubmit,
			})}
		>
			{({ isSubmitting, canSubmit }) => {
				return (
					<div
						className={cn(
							"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
							className,
						)}
					>
						{showCancelButton && (
							<Button
								type="button"
								variant="outline"
								onClick={handleCancel}
								disabled={isSubmitting}
							>
								{cancelText}
							</Button>
						)}
						<Button type="submit" disabled={!canSubmit}>
							{submitText(isSubmitting)}
						</Button>
					</div>
				);
			}}
		</form.Subscribe>
	);
};
