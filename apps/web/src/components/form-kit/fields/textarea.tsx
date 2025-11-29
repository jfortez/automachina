import { Textarea } from "@/components/ui/textarea";
import { useFieldContext } from "../form";
import type { FieldProps } from "./type";

const TextareaField = (props: FieldProps) => {
	const field = useFieldContext<string>();
	return (
		<Textarea
			{...props}
			value={field.state.value}
			onChange={(e) => field.handleChange(e.target.value)}
			className="flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent"
		/>
	);
};

export default TextareaField;
