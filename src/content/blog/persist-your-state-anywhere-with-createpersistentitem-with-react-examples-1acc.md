---
id: 1133215
title: "Persist your state anywhere with createPersistentItem with React examples"
description: "Persisting your state can sometimes be difficult. Useful ways to do it are setting the value to..."
path: "/jussinevavuori/persist-your-state-anywhere-with-createpersistentitem-with-react-examples-1acc"
url: "https://dev.to/jussinevavuori/persist-your-state-anywhere-with-createpersistentitem-with-react-examples-1acc"
commentsCount: 0
publicReactionsCount: 15
publishedTimestamp: 2022-07-11T07:04:33Z
positiveReactionsCount: 15
coverImage: "https://res.cloudinary.com/practicaldev/image/fetch/s--2QC_mYeb--/c_imagga_scale,f_auto,fl_progressive,h_420,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/9onlbuk78um15ekvsbnm.png"
socialImage: "https://res.cloudinary.com/practicaldev/image/fetch/s--VTmDdhU7--/c_imagga_scale,f_auto,fl_progressive,h_500,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/9onlbuk78um15ekvsbnm.png"
canonicalUrl: "https://dev.to/jussinevavuori/persist-your-state-anywhere-with-createpersistentitem-with-react-examples-1acc"
createdAt: 2022-07-06T09:04:42Z
editedAt: 2022-07-11T07:43:03Z
crosspostedAt: null
publishedAt: 2022-07-11T07:04:33Z
lastCommentAt: 2022-07-11T07:04:33Z
readingTimeMinutes: 9
tags: ["programming", "javascript", "typescript", "react"]
---

Persisting your state can sometimes be difficult. Useful ways to do it are setting the value to `localStorage` or `sessionStorage`. But managing manual set and get operations on larger applications will become difficult. And what if you want to store your state on the server and sync it across devices? In that case you need even more hassle with `fetch` calls, `useEffects` and more. It becomes a great big hassle.

In this article we are going to discuss **a better solution**, which will not only scale well but provide us with features that aren’t available to us with just the local storage API, such as **typesafety** and **automatic updates**.

[**Follow the code on GitHub**](https://github.com/Jussinevavuori/use-persistent-item-example) where I have posted all the code shown in this article and more.

### Note on TypeScript and React

All the following code (with types removed) is also **valid JavaScript** and will also work in JavaScript. The implementation is also completely **framework agnostic** and will work with any framework, from vanilla JavaScript to Vue. The hook and React examples provided at the end of this article are however React-specific, but should be implementable in other frameworks as well to achieve similar results.

## The idea

The target is to create an API for working with pieces of data which are stored in persistent stores (`localStorage`, `sessionStorage`, a server) which provides us all the following perks:

- **Abstracts away the implementation of interacting with the store** using the strategy pattern and thus allows for implementing other stores as well.
- Is **typesafe**, with all values being validated.
- Supports **custom serialization and deserialization**.
- Contains a **subscribable** which allows for **subscribing to all state updates**, which will further allow us to create React hooks which automatically update to match the state (or similar constructs in other frameworks).
- **Provides a simple API** for interacting with the data with minimal functions `.get()`, `.set(value)`, `.update(prev => newValue)`, `.clear()` and `.subscribe(listener)`.

The solution is an abstraction, a function, `createPersistentItem` that creates a single centralized object with an API to access any single piece of persistent data, be it a primitive or a complex object.

Moreover, the function should take as an argument a persistence strategy, which handles the actual setting, getting and clearing of the value in any persistent store, such as `localStorage` or even a custom server.

## Let’s start off by tackling persistence strategies

Pesistence strategies are an important part of the solution. They abstract away the implementation of actually storing the data somewhere, be it `localStorage`, `sessionStorage`, a database via an API or any other solution.

A persistence strategy should implement three methods: `get`, `set` and `clear` for getting, setting and clearing an item for a given key with a value of a given type.

Additionally, some storage methods are synchronous, such as `localStorage` and `sessionStorage` and we might want to get the data synchronously from these stores when possible. To support this functionality, we add another method, `getSync` which returns the value synchronously and a flag (`supportsSync`), which tells the user whether the persistence strategy supports synchronous operations. Using `getSync` for async stores (such as an API) will always return `undefined` as they can not fetch the data synchronously.

From the above plan, we get the following interface for all persistence strategies.

```tsx
// src/lib/PersistenceStrategy.ts

export interface IPersistenceStrategy {
  supportsSync?: boolean;
  get<T>(options: PersistenceStrategyGetOptions<T>): Promise<T | undefined>;
  getSync<T>(options: PersistenceStrategyGetOptions<T>): T | undefined;
  set<T>(options: PersistenceStrategySetOptions<T>): Promise<T>;
  clear(key: string): Promise<void>;
}
```

Additionally, the `PersistenceStrategyGetOptions` and `PersistenceStrategySetOptions` are defined below. They include a key to identify where the value is stored. For getting the value, we also provide methods for validating the value and optionally deserializing the value (else we use `JSON.parse`). For setting the value respectively, we provide the value we want to set and optionally a function to serialize it when `JSON.stringify` will not do.

```tsx
// src/lib/PersistenceStrategy.ts

export type PersistenceStrategyGetOptions<T> = {
  key: string;
  validate: (t: any) => t is T;
  deserialize?: (serial: string) => T | undefined;
};

export type PersistenceStrategySetOptions<T> = {
  key: string;
  value: T;
  serialize?: (t: T) => string;
};
```

Following these guidelines, we can create an example strategy for storing items in `localStorage`.

```tsx
// src/lib/LocalStoragePersistenceStrategy.ts

export const LocalStoragePersistenceStrategy: IPersistenceStrategy = {
	// Local storage supports synchronous operations
  supportsSync: true,

  // Local storage synchronous getter
  getSync<T>(opts: PersistenceStrategyGetOptions<T>): T | undefined {
    try {
      // Get serial value from local storage, if not found return undefiend
      const serial = localStorage.getItem(opts.key);
      if (!serial) return undefined;

      // Deserialize with deserializer or JSON.parse if no deserializer,
			// return undefined if serialization fails
      const value = opts.deserialize
        ? opts.deserialize(serial)
        : JSON.parse(serial);
      if (!value) return undefined;

      // Validate, return value or undefined on invalid validation
      if (opts.validate(value)) return value;
      return undefined;
    } catch (e) {
			// On all errors return undefined
			console.error(e);
      return undefined;
    }
  },

  // Async getter simply promisifies the sync getter method
  async get<T>(opts: PersistenceStrategyGetOptions<T>): Promise<T | undefined> {
    return this.getSync(opts);
  },

  async set<T>(opts: PersistenceStrategySetOptions<T>): Promise<T> {
    // Serialize with serializer or JSON.stringify and save to localStorage
    const serial = opts.serialize
      ? opts.serialize(opts.value)
      : JSON.stringify(opts.value);
    localStorage.setItem(opts.key, serial);
    return opts.value;
  },

  // Clear value
  async clear(key: string): Promise<void> {
    localStorage.removeItem(key);
  },
};
```

### Other persistence strategies

- The `SessionStoragePersistenceStrategy` ([view code on GitHub](https://github.com/Jussinevavuori/use-persistent-item-example/blob/main/src/lib/SessionStoragePersistenceStrategy.ts)) is an exact copy of the `LocalStoragePersistenceStrategy`, but with `localStorage` swapper for `sessionStorage`.
- The `ServerPersistenceStrategy` ([view code on GitHub](https://github.com/Jussinevavuori/use-persistent-item-example/blob/main/src/lib/ServerPersistenceStrategy.ts)) is an example persistence strategy for interacting with the simplest possible API for storing items on the server. Unlike `LocalStoragePersistenceStrategy`, it is async only and calling the `getSync` method will always result in undefined. ([View the simplest implementation of an express server which handles the requests from `ServerPersistenceStrategy`](https://github.com/Jussinevavuori/use-persistent-item-example/blob/main/example-server.js))

## Implementing createPersistentItem

Now that we have tackled persistence strategies and our persistent items no longer need to worry about the details of how they will be fetched, updated and cleared, we can continue on with implementing persistent items. The first step is to define an interface for persistent items, which contains three parts.

- Data getting methods
    - `get()` for asynchronously getting the value of the item.
    - `getSync()` for synchronously getting the value of the item if the persistence strategy supports synchronous operations (when `persistenceStrategy.supportsSync` is `true`).
    - `subscribe(listener)` which subscribes to all state updates and returns an unsubscriber function.
- Date updating methods
    - `set(value)` for setting the value. Returns the new value.
    - `update(updater)` for updating the value with an updater function when the next value depends on the previous value. Returns the new value.
    - `clear()` for clearing the value.
- Options for the persistent item. These are also the options that are provided when creating a persistent item.
    - `key` for storing the persistent item.
    - `persistenceStrategy` for storing the item in a store.
    - `validate` for validating that a value is a valid value for this item.
    - `serialize` for optionally overriding `JSON.stringify` serialization.
    - `deserialize` for optionally overriding `JSON.parse` deserialization.

The final interface will look like the following.

```tsx
// src/lib/createPersistentItem.ts

export interface IPersistentItem<T> {
  // Interfaces for getting data (sync / async) and subscribing to data updates
  get(): Promise<T | undefined>;
  getSync(): T | undefined;
  subscribe(listener: (t: T | undefined) => void): () => void;

  // Interfaces for updating data (set value, update value with updater function
  // or clear value)
  set(value: T): Promise<T>;
  update(updater: (t: T | undefined) => T): Promise<T>;
  clear(): Promise<void>;

  // Options
  key: string;
  persistenceStrategy: IPersistenceStrategy;
  validate: (t: any) => t is T;
  serialize?: (t: T) => string;
  deserialize?: (string: string) => T | undefined;
}
```

Let’s start implementing this. First we’ll define the function signature (options and return type). The function will return a `IPersistentItem<T>` as defined previously and take as options the previously discussed options and directly reveal them in the return value.

```tsx
// src/lib/createPersistentItem.ts

export function createPersistentItem<T>(options: {
  key: string;
  validate: (t: any) => t is T;
  persistenceStrategy: IPersistenceStrategy;
  serialize?: (t: T) => string;
  deserialize?: (string: string) => T | undefined;
}): IPersistentItem<T> {

	/* ... */

	return {
		// Reveal the options
		...options,

		/* ... Implement rest of the methods here ... */
	}  
}
```

Let’s next implement each method. First, the getter methods `get` and `getSync` are simple calls to the `persistenceStrategy.get` and `persistenceStrategy.getSync` methods respectively.

```tsx
// src/lib/createPersistentItem.ts

export function createPersistentItem<T>(/* ... */): IPersistentItem<T> {
	/* .. */
	return {
    ...options,
    getSync() {
      return options.persistenceStrategy.getSync({
        key: options.key,
        validate: options.validate,
        deserialize: options.deserialize
      });
    },
    get() {
      return options.persistenceStrategy.get({
        key: options.key,
        validate: options.validate,
        deserialize: options.deserialize
      });
    },
	}
}
```

Next up lets implement the `subscribe` method. For that use, we are going to need an internal `subscribable`, created with a `createSubscribable` method ([see here for implementation](https://github.com/Jussinevavuori/use-persistent-item-example/blob/main/src/lib/createSubscribable.ts)). That subscribable is going to receive updates from all data updating methods (`set`, `update` and `clear`) and `subscribe` is going to only function as a wrapper for `subscribable.subscribe`. After implementing `createSubscribable`, the implementation is as easy as below.

```tsx
// src/lib/createPersistentItem.ts

export function createPersistentItem<T>(/* ... */): IPersistentItem<T> {

	const subscribable = createSubscribable<T | undefined>();

	return {
    ...options,
    getSync() { /* ... */ },
    get() { /* ... */ },
		subscribe: subscribable.subscribe,
	}
}
```

This allows us to finally implement all data updating methods. Each of the methods is primarily a call to either the `persistenceStrategy.set` or `persistenceStrategy.clear` methods. Additionally, the methods handle errors, publish the new value to the `subscribable` after successfully updating the value and return the new value. In addition, `update` also fetches the previous value and uses it to call the provided `updater` function to derive the new value.

```tsx
// src/lib/createPersistentItem.ts

export function createPersistentItem<T>(/* ... */): IPersistentItem<T> {
	const subscribable = createSubscribable<T | undefined>();
	return {
    ...options,
    getSync() { /* ... */ },
    get() { /* ... */ },
		subscribe: subscribable.subscribe,

		async set(value: T) {
      try {
        await options.persistenceStrategy.set({
          value,
          key: options.key,
          serialize: options.serialize,
        });
        subscribable.publish(value);
      } catch (e) {
        console.error(e);
      } finally {
        return value;
      }
    },

    async update(updater: (prev: T | undefined) => T) {
      const prev = await this.get();
      const value = updater(prev);
      try {
        await options.persistenceStrategy.set({
          value,
          key: options.key,
          serialize: options.serialize,
        });
        subscribable.publish(value);
      } catch (e) {
        console.error(e);
      } finally {
        return value;
      }
    },

    async clear() {
      try {
        await options.persistenceStrategy.clear(options.key);
        subscribable.publish(undefined);
      } catch (e) {
        console.error(e);
      }
    },
	}
}
```

There we have it! A wrapper for persistent items!

## Using persistent items

We can now use the API for example for storing the number of clicks to a button as follows.

```tsx
const nClicks = createPersistentItem<number>({
	key: "clicks",
	validate: (t: any): t is number => typeof t === "number" && t >= 0,
	persistenceStrategy: LocalStoragePersistenceStrategy
})

// Setting the value to a number from an input
document.querySelector("button#set").addEventListener("click", () => {
	nClicks.set(document.querySelector("input#num").valueAsNumber);
});

// Updating the value
document.querySelector("button#add").addEventListener("click", () => {
	nClicks.update(prev => (prev ?? 0) + 1);
});

// Resetting the value
document.querySelector("button#reset").addEventListener("click", () => {
	nClicks.clear();
});

// Logging each new value to the console
nClicks.subscribe(newValue => console.log(newValue));

```

## Creating a React hook

For easier use with React, we can also create a custom hook for accessing the current value of a persistent item. The hook will allow us to automatically rerender a component whenever the persistent item’s value is updated from anywhere within the app.

The hook contains takes as input a persistent item and contains its value in a `useState`. The state is initialized with the `getSync` method, which will automatically be `undefined` for async items. For async items, another `useEffect` is fired once which asynchronously initializes the state from undefined. Finally another `useEffect` is fired which handles subscribing and unsubscribing to state updates.

```tsx
// src/hooks/usePersistentItem.ts

export function usePersistentItem<T>(item: IPersistentItem<T>) {
  // State for holding current value, automatically updated. Initialize with
  // synchronously gotten value (undefined for async persistence strategies).
  const [value, setValue] = useState<T | undefined>(item.getSync());

  // Initialize value asynchronously for async persistence strategies
  useEffect(() => {
    if (!item.persistenceStrategy.supportsSync) {
      item.get().then((_) => setValue(_));
    }
  }, [setValue, item]);

  // Subscribe to updates and auto-update state
  useEffect(() => item.subscribe((t) => setValue(t)), [setValue, item]);

  // Return current value
  return value;
}
```

The following snippet demonstrates the usage of the hook. The beautiful thing about this centralized implementation with a `subscribable` is that clicking one button automatically increments the value in both buttons as they are subscribed to the same item. The value is stored in local storage, but changing it to be stored in session storage, on a server or somewhere else is as easy as changing the persistence strategy.

```tsx
// src/App.tsx

function Counter(props: { item: IPersistentItem<number>, label: string }) {
	const clicks = usePersistentItem(props.item);

	return <div>
		<p>
			{props.label}
		</p>
		<button onClick={() => props.item.update(current => (current ?? 0) + 1)}>
			Clicked {clicks ?? 0} times
		</button>
		<button onClick={() => props.item.set(5)}>
			Set to 5
		</button>
		<button onClick={() => props.item.clear()}>
			Reset
		</button>
	</div>
}

function App() {
	return (
		<div>
			<Counter item={nClicks} label="Local storage 1" />
			<Counter item={nClicks} label="Local storage 2" />
		</div>
	);
}

const nClicks = createPersistentItem<number>({
	key: "clicks",
	validate: (t: any): t is number => typeof t === "number" && t >= 0,
	persistenceStrategy: LocalStoragePersistenceStrategy
});
```

## Final words

Thank you for reading. You are free to use the pattern provided in this article as well as any code you find here. Please feel free to send me a message if you find this useful or find a way to make this even better.

### Ideas on how to make this better

1. **Reducing boilerplate for persistence strategies**

Currently writing persistence strategies creates some boilerplate in our code. In each persistence strategy, we must declare error handling, serialization, deserialization and validation manually. However, you could easily create another abstraction (`createAsyncPersistenceStrategy` and `createSyncPersistenceStrategy`) which could be used as follows:

```tsx
// Example API

export const LocalStoragePersistenceStrategy = createSyncPersistenceStrategy({
	get(key: string): string | undefined {
		return localStorage.getItem(key) ?? undefined;
	},
	set(key: string, serial: string): void {
		localStorage.setItem(key, serial);
	},
	clear(key: string): void {
		localStorage.removeItem(key);
	}
});
```

Here `createSyncPersistenceStrategy` and `createAsyncPersistenceStrategy` simply take the implementations of fetching a serialized value, setting a serialized value and clearing the value and wrap them with validation, serialization, deserialization, correct `get` and `getSync` and `supportsSync` implementations and error handling. The implementations can be found in GitHub, together with example usage of them for creating `LocalStoragePersistenceStrategy` and `ServerPersistenceStrategy` with the functions.

- [createAsyncPersistenceStrategy](https://github.com/Jussinevavuori/use-persistent-item-example/blob/main/src/lib/createAsyncPersistenceStrategy.ts)
- [createSyncPersistenceStrategy](https://github.com/Jussinevavuori/use-persistent-item-example/blob/main/src/lib/createSyncPersistenceStrategy.ts)