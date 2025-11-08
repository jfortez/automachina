import type { ControllerRenderProps } from "react-hook-form";

type DataProps = ControllerRenderProps;

export const DateComponent = (props: DataProps) => {
	return <input type="date" {...props} />;
};

export default DateComponent;
