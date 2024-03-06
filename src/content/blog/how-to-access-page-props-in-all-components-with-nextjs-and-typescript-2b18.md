---
id: 1127334
title: "How To Access Page Props in All Components with Next.js and TypeScript"
description: "The problem: Lifting page props from getStaticProps to your &lt;Layout/&gt; component, rendered in..."
path: "/jussinevavuori/how-to-access-page-props-in-all-components-with-nextjs-and-typescript-2b18"
url: "https://dev.to/jussinevavuori/how-to-access-page-props-in-all-components-with-nextjs-and-typescript-2b18"
commentsCount: 0
publicReactionsCount: 3
publishedTimestamp: 2022-07-01T11:17:02Z
positiveReactionsCount: 3
coverImage: "https://media.dev.to/cdn-cgi/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fusalsr46sielhm61cddj.png"
socialImage: "https://media.dev.to/cdn-cgi/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fusalsr46sielhm61cddj.png"
canonicalUrl: "https://dev.to/jussinevavuori/how-to-access-page-props-in-all-components-with-nextjs-and-typescript-2b18"
createdAt: 2022-06-29T08:35:02Z
editedAt: 2022-07-01T11:17:44Z
crosspostedAt: null
publishedAt: 2022-07-01T11:17:02Z
lastCommentAt: 2022-07-01T11:17:02Z
readingTimeMinutes: 8
tags: ["nextjs", "typescript", "webdev", "javascript"]
---

**The problem:** Lifting page props from `getStaticProps` to your `<Layout/>` component, rendered in `_app.tsx` is a hassle. In fact, Next.js provides no existing solution to that problem and we have to come up with one ourselves. In this article I present the idea of global props as a solution.

## When would I ever need to do this?

A simple scenario where I could see this happening is on a site with a selection of products. Each product is fetched in `getStaticProps`, in `/products` and the developer wants to display the number of products in the header, next to the link to the `/products` page.

This means the developer has to send the `products` prop received by the products page component from `getStaticProps` all the way to the `<Header/>` component, rendered by `<Layout/>` in `_app.tsx`.

A worse developer might come up with a “quick hack”, a one-off solution to get just this feature working. For example, they might set up a pubsub system, where the header component subscribes to a `subscribable`, and the `/products` page component publishes the props it receives. Will work, but runs the risk of becoming unmaintainable and confusing as the data is moving sideways through the component tree via an external `subscribable`.

Instead, this article demonstrates another way of passing data into the entire application.

## Introducing global props

The solution I ended up using on my personal portfolio page, as well as other projects I have worked on is `GlobalProps`.

We declare certain props as global, which are accessible on all pages. In the above example, that might be a list of `products`. These could also be `projects` and `blogs` on your personal page or any other server-side fetched data that is accessible to the entire application. The essence of the solution goes as follows.

1. On all pages, fetch the global props (and other page-specific props)
2. Intercept the global props in `_app.tsx` using `pageProps`
3. Pass the global props to a `GlobalPropsContext` in `_app.tsx`
4. Use the global props in ANY component with a custom hook.

In addition to the solution, I will also provide some utility functions which make these steps easier. Especially step 1, fetching the global props on each page, which could result in a lot of code duplication with a worse implementation.

### GitHub

[Follow the code on GitHub](https://github.com/Jussinevavuori/next-global-props-example)

## Step 1 - Define the global props

First we define what props we want to declare as global. We are going to run with the above example and define `products` as a global prop we want to be accessible app-wide. Let’s declare it as a type, assuming we have some `Product` type.

```tsx
// types/index.d.ts

type Product = { /* ... */ }

type GlobalProps = {
	product: Product[];
};
```

## Step 2 - Fetching the global props

Step 1 was easy. Now we can get on with even more code. Let’s assume we have a `productApi`, which defines the `productApi.getAll(): Promise<Product[]>` method for fetching all products.

Let’s first define a utility function which fetches global props.

```tsx
// features/GlobalProps/lib/fetchGlobalProps.ts

import { productsApi } from "../../../lib/api/productsApi";

export async function fetchGlobalProps(): Promise<GlobalProps> {
  return {
    products: await productsApi.getAll(),
  };
}
```

We could now use this function on all pages as follows

```tsx
// pages/index.tsx

import type { GetStaticProps, InferGetStaticPropsType } from 'next'
import { fetchGlobalProps } from '../features/GlobalProps/lib/fetchGlobalProps';

type PageProps = InferGetStaticPropsType<typeof getStaticProps>;

export default function Page(props: PageProps) {
	return (
		<div style={{ padding: "8rem" }}>

			<h1>Home</h1>

		</div>
	)
}

export const getStaticProps: GetStaticProps<GlobalProps> = async () => {
	return {
		props: {
			...await fetchGlobalProps(),
		}
	}
}
```

But we can make this even nicer by providing a `getStaticProps` wrapper that automatically adds global props to any `getStaticProps` function.

Let’s define `getStaticPropsWithGlobalProps` for this purpose. It’ll act as a wrapper for the `getStaticProps` function and can fetch the rest of the data required by the page using the regular `getStaticProps` API, however it automatically adds the global props to the returned props, with automatic typing.

```tsx
// features/GlobalProps/lib/getStaticPropsWithGlobalProps.ts

import {
  GetStaticProps,
  GetStaticPropsContext,
  GetStaticPropsResult,
} from "next";
import { fetchGlobalProps } from "./fetchGlobalProps";

export function getStaticPropsWithGlobalProps<T extends {}>(
  getStaticProps: (
    ctx: GetStaticPropsContext,
    globalProps: GlobalProps
  ) => Promise<GetStaticPropsResult<T>>
): GetStaticProps<T & GlobalProps> {

  // Construct getStaticProps function
  return async (ctx: GetStaticPropsContext) => {

    // Fetch global props
    const globalProps = await fetchGlobalProps();

    // Run getStaticProps with user defined getStaticProps, provide context
    // and global props
    const result = await getStaticProps(ctx, globalProps);

    // If redirect or notFound in result, return result as is, in this case
    // no page props will be provided
    if ("redirect" in result || "notFound" in result) {
      return result;
    }

    // Return combined page props and global props as page props
    return {
      props: {
        ...result.props,
        ...globalProps,
      },
      revalidate: result.revalidate,
    };
  };
}
```

Let’s also quickly define a `GlobalProps` object which exports all functionality meant for the public API of this feature and export this function as `getStaticProps`.

```tsx
// features/GlobalProps/GlobalProps.ts

import { getStaticPropsWithGlobalProps } from "./lib/getStaticPropsWithGlobalProps";

// Defines the public API
export const GlobalProps = {
  getStaticProps: getStaticPropsWithGlobalProps,
};
```

Now we can use it on our pages as follows.

```tsx
// pages/products.tsx

// ...

export const getStaticProps = GlobalProps.getStaticProps<{exampleValue: number}>(
	async (ctx) => {
		return { props: { exampleValue: 1 } }
	}
)
```

The page will now have access to both `products`, along with all the other components in the app. The page will also have access to `someOtherProp`, however it will not be accessible to the rest of the app, only the page via page props.

### Accessing Global Props in `getStaticProps`

Furthermore, we can access the global props in the `getStaticProps` implementation as the second argument after `ctx`, the default `getStaticProps` context object. This is useful for example on the product page, where the props depend on the global props.

```tsx
// pages/products/[slug].ts

import { GetStaticPaths, InferGetStaticPropsType } from "next";
import { GlobalProps } from "../../features/GlobalProps/GlobalProps";
import { productsApi } from "../../lib/api/productsApi";

type PageProps = InferGetStaticPropsType<typeof getStaticProps>;

export default function Page(props: PageProps) {
	return <div style={{ padding: "8rem" }}>
		<h1>{props.product.name}</h1>
		<p>{props.product.price} $</p>
	</div>
}

export const getStaticPaths: GetStaticPaths = async () => {
	const products = await productsApi.getAll()
	return {
		paths: products.map(p => ({ params: { slug: p.slug } })),
		fallback: false,
	}
}

export const getStaticProps = GlobalProps.getStaticProps<{ product: Product }>(
	async (ctx, globalProps) => {

		// GetStaticProps has access to the global props as the parameter
		const slug = (ctx.params?.["slug"] ?? "").toString()
		const product = globalProps.products.find(_ => _.slug === slug)

		if (!product) return { notFound: true }

		return { props: { product } }
	}
)
```

### Utility for pages with no static props other than the global props

Instead of having to type out 

`export const getStaticProps = GlobalProps.getStaticProps(async () => ({ props: { } }))` 

for every route without props, let’s define `GlobalProps.getEmptyStaticProps` to do it for us. Then we can simply write

`export const getStaticProps = GlobalPrsop.getEmptyStaticProps`

```tsx
// features/GlobalProps/GlobalProps.ts

import {
  GlobalPropsContextProvider,
  useGlobalProps,
} from "./contexts/GlobalPropsContext";
import { extractGlobalProps } from "./lib/extractGlobalProps";
import { getStaticPropsWithGlobalProps } from "./lib/getStaticPropsWithGlobalProps";

// Defines the public API
export const GlobalProps = {
  getStaticProps: getStaticPropsWithGlobalProps,

	// ADD THIS:
  getEmptyStaticProps: getStaticPropsWithGlobalProps(async () => ({
    props: {},
  })),
};
```

## Step 3 - Providing global props via a context

Let’s start by defining a React context for passing the global props to the entire component tree.

```tsx
// features/GlobalProps/contexts/GlobalPropsContext.tsx

import { createContext, useContext, ReactNode } from "react"

// Default value for global props
export const defaultGlobalPropsContextValue: GlobalProps = {
	products: [],
}

// Global props context
export const GlobalPropsContext = createContext<GlobalProps>(defaultGlobalPropsContextValue)

// Global props context provider props
export interface GlobalPropsContextProviderProps {
	children?: ReactNode,
	globalProps: GlobalProps;
}

// Global props context provider
export function GlobalPropsContextProvider(props: GlobalPropsContextProviderProps) {

	return <GlobalPropsContext.Provider value={props.globalProps}>
		{props.children}
	</GlobalPropsContext.Provider>

}

// Utility hook to access global props
export function useGlobalProps() {
	return useContext(GlobalPropsContext)
}
```

The context is a regular context which has to be provided the global props which are then passed on. Note the `useGlobalProps()` hook which is later used to access these global props.

Let’s now also export these to our public API. For shorter syntax, I’m also going to call `useGlobalProps()` simply `use()`. This means we can just call `GlobalProps.use()` from our components to access the props.

```tsx
// features/GlobalProps/GlobalProps.ts

import {
  GlobalPropsContextProvider,
  useGlobalProps,
} from "./contexts/GlobalPropsContext";
import { extractGlobalProps } from "./lib/extractGlobalProps";
import { getStaticPropsWithGlobalProps } from "./lib/getStaticPropsWithGlobalProps";

// Defines the public API
export const GlobalProps = {
  getStaticProps: getStaticPropsWithGlobalProps,
  getEmptyStaticProps: getStaticPropsWithGlobalProps(async () => ({
    props: {},
  })),
  Provider: GlobalPropsContextProvider,
  use: useGlobalProps,
	extract: extractGlobalProps,
};
```

Wait a minute - what is `extractGlobalProps`? In short, `_app.tsx` will receive a `pageProps` object of unknown type. We have to take the `pageProps` object and extract the `globalProps` from it into an object of type `GlobalProps`. At the same time we have to handle errors and invalid or missing data and provide default values. The implementation is the following for this use case (assuming a `productsApi.isProducts(arg): arg is Product[]` function exists.

```tsx
// features/GlobalProps/lib/extractGlobalProps.ts

import { productsApi } from "../../../lib/api/productsApi";
import { defaultGlobalPropsContextValue } from "../contexts/GlobalPropsContext";

export function extractGlobalProps(data: any): GlobalProps {
  if (!data) return defaultGlobalPropsContextValue;

  // Do it the correct way with type validation and default values
  return {
    products: productsApi.isProducts(data.products) ? data.products : [],
  };

  // Or do it the lazy, error prone way if you trust your pageProps to have
	// the correct shape
	// return data as GlobalProps;
}
```

Now the last thing to get the props to our entire application is to provide them in `_app.tsx`. We set the `GlobalProps.Provider` as the root component in our application in order for all components to have access to `GlobalProps` and pass the extracted global props as an argument to it.

```tsx
// pages/_app.tsx

import type { AppProps } from 'next/app'
import { GlobalPropsContextProvider } from '../features/GlobalProps/contexts/GlobalPropsContext'
import { GlobalProps } from '../features/GlobalProps/GlobalProps'
import { Layout } from '../components/Layout/Layout'

function MyApp({ Component, pageProps }: AppProps) {
	return <GlobalPropsContextProvider globalProps={GlobalProps.extract(pageProps)}>
		<Layout>
			<Component {...pageProps} />
		</Layout>
	</GlobalPropsContextProvider>
}

export default MyApp
```

There! Now our entire application can access the global props. Just as long as we remember to implement fetching on all pages, as shown in the next step.

## Step 4 - Fetching on all routes

The above solution will only work as long as every route (including `404.tsx` and `500.tsx`) fetches the global props. It will not error out else, but will provide the default values for the global props which we do not want.

Luckily, refactoring components is easy.

### Refactoring a component with no static props

Refactoring components with no static props is easy. It requires three changes (shown in the code below)

1. Import `GlobalProps`
2. Create an empty `getStaticProps` function with the `GlobalProps.getEmptyStaticProps`

```tsx
// ORIGINAL

export default function Page() {
	return (
		<div style={{ padding: "8rem" }}>
			<h1>Home</h1>
		</div>
	)
}

// REFACTORED

// Step 1 - Import Global Props
import { GlobalProps } from '../features/GlobalProps/GlobalProps';

export default function Page(props: PageProps) {
	return (
		<div style={{ padding: "8rem" }}>
			<h1>Home</h1>
		</div>
	)
}

// Step 2 - Add an empty getStaticProps function
export const getStaticProps = GlobalProps.getEmptyStaticProps
```

### Refactoring a page with static props

The process is as easy for page with static props. Similarly the two steps are:

1. Import `GlobalProps`
2. Wrap the `getStaticProps` function implementation with `GlobalProps.getStaticProps`

```tsx
// pages/with-static-props.ts

// ORIGINAL

import { GetStaticProps, InferGetStaticPropsType } from 'next';

type PageProps = InferGetStaticPropsType<typeof getStaticProps>;

export default function Page(props: PageProps) {
	return (
		<div style={{ padding: "8rem" }}>
			<h1>WithStaticProps</h1>
			<p>Example value = {props.exampleValue}</p>
		</div>
	)
}

export const getStaticProps: GetStaticProps = async (ctx) => {
	return {
		props: {
			exampleValue: 1,
		}
	}
}

// REFACTORED

// Step 1 - Import Global Props
import { InferGetStaticPropsType } from 'next';
import { GlobalProps } from '../features/GlobalProps/GlobalProps';

type PageProps = InferGetStaticPropsType<typeof getStaticProps>;

export default function Page(props: PageProps) {
	return (
		<div style={{ padding: "8rem" }}>
			<h1>WithStaticProps</h1>
			<p>Example value = {props.exampleValue}</p>
		</div>
	)
}

// Step 2 - Wrap getStaticProps in GlobalProps.getStaticProps
export const getStaticProps = GlobalProps.getStaticProps(async () => {
	return { props: { exampleValue: 1 } }
})
```

## Final step - Consume and enjoy!

There you have it. After every route has been given either the `GlobalProps.getStaticProps` or `GlobalProps.getEmptyStaticProps` function, we can finally do what we wanted to do in the beginning. Access the products in the header. And it becomes as simple as the following. Just access all global props with the `GlobalProps.use()` hook.

```tsx
// components/Header/Header.tsx

import Link from "next/link";
import { GlobalProps } from "../../features/GlobalProps/GlobalProps";

export function Header() {
	const { products } = GlobalProps.use();

	return <header>
		<nav>
			<Link href="/">
				<a>Home</a>
			</Link>
			<Link href="/products">
				<a>Products ({products.length})</a>
			</Link>
		</nav>
	</header>
}
```

## Final words

This provides a useful abstraction for some use cases, where a concept of global props is useful. And I could see it being used on a lot of different cases. I have worked on projects like the above example where I wanted each page to be aware of `products`. Similarly on my personal page I have `blogs` and `projects` to name a few as global props that are used page-wide as global props. And I imagine there are many more use cases for this.

**If you use this**, please do let me know. Similarly, if you have any improvements to this article, don’t hesitate to send me a message!