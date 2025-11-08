import type { ControllerRenderProps } from "react-hook-form";
import { Input } from "@/components/ui/input";

type InputProps = ControllerRenderProps;

export const InputField = (props: InputProps) => {
	return <Input type="text" {...props} />;
};

export default InputField;
