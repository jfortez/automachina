import { Textarea } from "@/components/ui/textarea";
import type { FieldProps } from "./type";

const TextareaField = (props: FieldProps) => {
	return (
		<Textarea
			{...props}
			className="flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent"
		/>
	);
};

export default TextareaField;
