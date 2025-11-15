import type React from "react";
import { Builder } from "./builder";
import { Hub, type HubItem, type HubItemsMap } from "./hub";
import { Store } from "./store";
import type { HubItemComponentProps } from "./types";

export class Factory<
	TKeys extends readonly string[],
	Items extends HubItemsMap = Record<string, never>,
> extends Store<TKeys> {
	private hub: Hub<Items>;

	constructor(keys: TKeys) {
		super(keys);
		this.hub = new Hub<Items>();
	}

	createHOC<
		TKey extends TKeys[number],
		THubItemName extends keyof Items,
		ItemProps extends React.ComponentProps<Items[THubItemName]["render"]>,
	>(key: TKey, hubItemName: THubItemName) {
		const hubItem = this.hub.get(hubItemName);
		const HubItemComponent = hubItem.render;
		return new Builder<
			TKeys,
			TKey,
			Omit<ItemProps, keyof HubItemComponentProps>
		>(key, this.useFactoryStore, HubItemComponent);
	}

	private get useFactoryStore() {
		return this.getStore();
	}

	with<THubItemName extends string, ItemProps extends object = object>(
		item: HubItem<THubItemName, ItemProps>,
	): Factory<
		TKeys,
		Items & Record<THubItemName, HubItem<THubItemName, ItemProps>>
	> {
		this.hub.add<THubItemName, ItemProps>(item);
		return this as Factory<
			TKeys,
			Items & Record<THubItemName, HubItem<THubItemName, ItemProps>>
		>;
	}

	build() {
		return {
			createHOC: this.createHOC.bind(this),
			useFactoryStore: this.useFactoryStore,
		};
	}
}
