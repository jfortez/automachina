import type React from "react";
import type { HubItemComponentProps, InitHocProps } from "./types";

export interface HubItem<
	Key extends string = string,
	OtherProps extends object = object,
> {
	name: Key;
	render: (
		opt: HubItemComponentProps & InitHocProps<OtherProps>,
	) => React.ReactElement;
}

export const createHubItem = <
	Key extends string = string,
	ItemProps extends object = object,
>(
	config: HubItem<Key, ItemProps>,
): HubItem<Key, ItemProps> => {
	return {
		name: config.name,
		render: config.render,
	};
};

export type HubItemsMap = Record<string, HubItem<any, any>>;

export class Hub<Items extends HubItemsMap = Record<string, never>> {
	private items: HubItem<string, object>[] = [];

	add<Key extends string, ItemProps extends object = object>(
		config: HubItem<Key, ItemProps>,
	): Hub<Items & Record<Key, HubItem<Key, ItemProps>>> {
		this.items.push(config as unknown as HubItem<string, object>);
		return this as any as Hub<Items & Record<Key, HubItem<Key, ItemProps>>>;
	}

	get<Key extends keyof Items>(key: Key): Items[Key] {
		const item = this.items.find((item) => item.name === key);
		if (!item) throw new Error(`Item ${String(key)} not found`);
		return item as Items[Key];
	}
}
