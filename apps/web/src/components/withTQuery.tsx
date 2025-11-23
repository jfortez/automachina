import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";

import type React from "react";
import { useMemo } from "react";
import { Spinner } from "@/components/ui/spinner";

type InferQueryData<T> = T extends UseQueryOptions<infer TData, any, any, any>
	? TData
	: never;

type InferQueryOptionsFromFn<T> = T extends (...args: any[]) => infer R ? R : T;

type ResolveDataType<TQueryOptionsOrFn, TData> = TData extends undefined
	? InferQueryData<InferQueryOptionsFromFn<TQueryOptionsOrFn>>
	: TData;

type NoGenericProvided = { __brand: "NoGenericProvided" };

const noop = () => {
	return undefined;
};
const noopQO = queryOptions({
	queryFn: noop,
	queryKey: ["noop"],
	enabled: false,
});
export const withQuery = <
	P extends object = object,
	TQueryOptionsOrFnOrData extends
		| UseQueryOptions<any, any, any, any>
		| ((...args: any[]) => UseQueryOptions<any, any, any, any>)
		| any = NoGenericProvided,
	TData = undefined,
>(
	Component: React.ComponentType<
		P & {
			data: TQueryOptionsOrFnOrData extends NoGenericProvided
				? TData
				: ResolveDataType<TQueryOptionsOrFnOrData, TData>;
		}
	>,
) => {
	type TQueryOptions = InferQueryOptionsFromFn<TQueryOptionsOrFnOrData>;
	type FinalDataType = ResolveDataType<TQueryOptionsOrFnOrData, TData>;
	type HasTData = TData extends undefined ? false : true;

	const ComponentWithQuery = <
		TRuntimeQueryOptions extends UseQueryOptions<any, any, any, any> = any,
	>(
		props: TQueryOptionsOrFnOrData extends NoGenericProvided
			? {
					queryOptions?: TRuntimeQueryOptions;
					mapData?: (data: InferQueryData<TRuntimeQueryOptions>) => any;
					loadingFallback?: React.ReactNode;
				} & P
			: HasTData extends true
				? {
						queryOptions?: TRuntimeQueryOptions;
						mapData?: (data: InferQueryData<TRuntimeQueryOptions>) => TData;
						loadingFallback?: React.ReactNode;
					} & P
				: {
						queryOptions?: TQueryOptions;
						mapData?: (data: FinalDataType) => any;
						loadingFallback?: React.ReactNode;
					} & P,
	): React.ReactElement => {
		const { queryOptions, mapData, loadingFallback, ...restProps } =
			props as any;

		const { data, isLoading, error } = useQuery(
			queryOptions ? queryOptions : noopQO,
		);
		const finalData = useMemo(
			() => (mapData ? mapData(data) : data),
			[data, mapData],
		);

		if (isLoading) return loadingFallback || <Spinner />;
		if (error) throw error;

		return <Component data={finalData} {...(restProps as P)} />;
	};

	ComponentWithQuery.displayName = `withQuery(${Component.displayName || Component.name})`;
	return ComponentWithQuery;
};
