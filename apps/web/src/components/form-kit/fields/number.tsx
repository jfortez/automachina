import { Input } from "@/components/ui/input";
import { useFieldContext } from "../form";
import type { FieldProps } from "./type";

const NumberField = (props: FieldProps) => {
	const field = useFieldContext<number>();
	return (
		<Input
			{...props}
			type="number"
			value={field.state.value ?? ""}
			onChange={(e) => field.handleChange(Number(e.target.value))}
			className="flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
		/>
	);
};

export default NumberField;
