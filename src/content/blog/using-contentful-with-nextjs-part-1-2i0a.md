---
id: 1156383
title: "How to use Contentful with Next.js and Zod"
description: "Using headless CMS’ with modern web technologies such as Next.js has long been a popular way to..."
path: "/jussinevavuori/using-contentful-with-nextjs-part-1-2i0a"
url: "https://dev.to/jussinevavuori/using-contentful-with-nextjs-part-1-2i0a"
commentsCount: 0
publicReactionsCount: 5
publishedTimestamp: 2022-08-01T12:59:00Z
positiveReactionsCount: 5
coverImage: "https://media.dev.to/cdn-cgi/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fsndm3sk4j8wfymi2to1a.png"
socialImage: "https://media.dev.to/cdn-cgi/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fsndm3sk4j8wfymi2to1a.png"
canonicalUrl: "https://dev.to/jussinevavuori/using-contentful-with-nextjs-part-1-2i0a"
createdAt: 2022-08-01T08:13:54Z
editedAt: 2022-08-18T15:11:54Z
crosspostedAt: null
publishedAt: 2022-08-01T12:59:00Z
lastCommentAt: 2022-08-01T12:59:20Z
readingTimeMinutes: 6
tags: ["cms", "nextjs", "typescript", "javascript"]
---

Using headless CMS’ with modern web technologies such as Next.js has long been a popular way to create websites and manage their content. In this article we’re going to explore a typesafe, easily extensible method of accessing your Contentful schemas.

**The target of this article** is to create an abstraction for each data model which allows for type safe querying. We call this abstraction `createContentfulModel`, which will take as input the schema for your content and provide you with typed and validated data.

## Step 1 - Setup your Contentful workspace and client

In order to setup your Contentful workspace, go to [contentful.com](https://www.contentful.com/), sign up and set up your Contentful workspace. There you can first create your content models and then create content to suit those models.

Returning to the code side of things, we first create a new next project (with TypeScript) and install `contentful` with npm.

```bash
$ npx create-next-app@latest --ts
$ npm i contentful
```

We set up our Contentful client in `contentful/client.ts` according to the Contentful documentation.

```tsx
import { createClient } from "contentful";

export const contentfulClient = createClient({
  space: process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID!,
  accessToken: process.env.NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN!,
});
```

We must also provide the necessary environment variables to set up our client and to connect it to our Contentful workspace. In Contentful, under **settings** and **API keys**, create a new API key. We’re going to need its **Space ID** and **Content Delivery API access token**. Copy and paste the correct values into your `.env.local` file as shown below.

```tsx
NEXT_PUBLIC_CONTENTFUL_SPACE_ID="your-space-id"
NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN="your-access-token"
```

## Step 2 - Set up Zod schemas for typesafety

First run `npm i zod` to install Zod, the arguably best type validation library available for TypeScript.

Before starting to set up the schemas and shapes for our content, we’re going to need Contentful specific types. All Contentful queries return **object entries**, which contain all content in the `fields` property, but also contain the `metadata` and `sys` properties which include useful metadata about the object, such as it’s ID and timestamps.

We’re first going to set up a `contentfulEntrySchema` in `contentful/contentful-entry-schema.ts` which will contain a Zod schema corresponding to an **object entry** with an empty `fields` property (which we will later extend).

```tsx
import { z } from "zod";

export const contentfulEntrySchema = z.object({
  fields: z.object({}), // Extend this later
  metadata: z.object({
    tags: z.array(z.any()),
  }),
  sys: z.object({
    space: z.object({
      sys: z.object({
        type: z.string(),
        linkType: z.string(),
        id: z.string(),
      }),
    }),
    id: z.string(),
    type: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    environment: z.object({
      sys: z.object({
        id: z.string(),
        type: z.string(),
        linkType: z.string(),
      }),
    }),
    revision: z.number(),
    contentType: z
      .object({
        sys: z.object({
          type: z.string(),
          linkType: z.string(),
          id: z.string(),
        }),
      })
      .optional(),
    locale: z.string(),
  }),
});
```

This allows fully validating all data queried from Contentful and we can easily extend it to suit any content type by overriding the `fields` property.

## Step 3 - Creating createContentfulModel

Now that we have most of our boilerplate set up, we’re going to start working on the `createContentfulModel` abstraction. Our objective is to create a function that takes as input

- `contentType`, which defines which content we want to target in our Contentful workspace
- `fieldsSchemaCreator` function, which returns a Zod schema for our content type and provides utilities for creating those schemas in a `context` object (more on it in the next article).

As output, we want the function to provide us an object with the following properties:

- The schemas which were created using `fieldsSchemaCreator`
- All data fetching functions (in this example we’re only going to implement `getAll`) to fetch all data without querying.

Let’s start creating the function in `contentful/create-contentful-model.ts`

```tsx
// More in the next article on the create contentful model context
export type CreateContentfulModelContext = {};

export type FieldsSchemaCreator<TDataIn extends {}, TDataOut> = (
	context: CreateContentfulModelContext
) => z.Schema<TDataOut, z.ZodTypeDef, TDataIn>;

export function createContentfulModel<TDataIn extends {}, TDataOut>(
	contentType: string,
	fieldsSchemaCreator: FieldsSchemaCreator<TDataIn, TDataOut>
) {
	...

	return { ... }
}
```

We want to be able to use this function as follows:

```tsx
const exampleModel = createContentfulModel("example", (ctx) => z.object({
	title: z.string(),
	description: z.string().optional(),
	rating: z.number().int().positive(),
}));

exampleModel.getAll().then(examples => {...})
```

The fields schema creator should return a Zod object which represents the fields of the content type we want to access. Let’s start implementing it.

```tsx
export function createContentfulModel<...>(...) {

	// Set up an empty context. We'll return to this in the next article.
	const context: CreateContentfulModelContext = {};

	// Run the fieldsSchemaCreator with the context to get the type of
	// the content's fields.
	const fieldsSchema = fieldsSchemaCreator(context);

	// Using the object entry schema we defined earlier, extend its fields
	// property to define this object type's full entry schema
	const entrySchema = contentfulEntrySchema.extend({ fields: fieldsSchema });

	// Return schemas
	return {
		fieldsSchema,
		entrySchema,
	}
}
```

We now have access to the full schemas. Next we need to create data fetcher functions, which will allow us to fetch data in all ways we need. **Note:** for this project we will only be implementing the `getAll` fetcher. Rest (`getOneById`, `getAllWhere`, and any others you might need) are left as an exercise to the reader. For small projects with only small amounts of data, especially with SSG `getAll` might be all you need.

```tsx
export function createContentfulModel<...>(...) {
	// ...

	// Create the get all fetcher to fetch all items of the current
	// content type.
	const getAll = async () => {
		// Fetch all items of current content type
		const res = await contentfulClient.getEntries({ content_type: contentType });

		// Parse and validate all items using zod
		const parsed = z.array(entrySchema).safeParse(res.items);

		// Handle failures
		if (!parsed.success) {
			console.error(parsed.error);
			return [];
		}

		// Return validated data with correct types
		return parsed.data;
	}

	return {
		fieldsSchema,
		entrySchema,
		getAll,
	}
}
```

We can now use `createContentfulModel` to create typed, validated abstractions for each of our content types in our Contentful workspace.

## Step 4 - Inferring the types

Let’s further utilise the magic of Zod. Instead of having to type out a type for each of our content models, we can simply infer the types from the schemas we already have. No more need for maintaining the representation of the content model in our code in two separate places. To easily infer the types, we’re going to create `types/contentful.d.ts` in our project. When using a `.d.ts` file with only inline imports, we don’t even need to import the types in our project where they are used, we only need to include `contentful.d.ts` in our `tsconfig.json`.

To help inferring the types, we’re going to create a utility type `ExtractModelType` which is provided any model created with `createContentfulModel` and it will return the type of the content entry.

```tsx
// types/contentful.d.ts

// Get inner type of Array or Promise
type Inner<T> = T extends Array<infer U1>
  ? U1
  : T extends Promise<infer U2>
  ? U2
  : T;

// Helper type to extract a model's type from the model object
type ExtractModelType<
  Model extends ReturnType<
    typeof import("../contentful/create-contentful-model")["createContentfulModel"]
  >
> = Inner<Inner<ReturnType<Model["getAll"]>>>;
```

Next we’re going to create an example content model at `/contentful/example-model.ts`.

```tsx
export const exampleModel = createContentfulModel("example", (ctx) => z.object({
	title: z.string(),
	description: z.string().optional(),
	rating: z.number().int().positive(),
}));
```

And infer it in `types/contentful.d.ts` as follows:

```tsx
type ExampleModelEntry = ExtractModelType<
  typeof import("../contentful/example-model")["exampleModel"]
>;

type ExampleModelFields = ExampleModelEntry["fields"];
```

The `ExampleModelEntry` type represents the full object entry returned by the Contentful in the fetcher functions. It contains all metadata in the `sys` and `metadata` fields. The content is contained in the `fields` property and has the type of `ExampleModelFields`.

## Step 5 - Consuming the models

After a lot of work to set up our Contentful models, we can now start consuming them in our applications. The work we did earlier starts now paying off, as consuming our types is as easy as doing the following `getStaticProps` (or any other place where you might fetch your data).

```tsx
import type { GetStaticProps, InferGetStaticPropsType } from 'next'
import { exampleModel } from '../contentful/example-model'

export default function Page({ examples }: InferGetStaticPropsType<typeof getStaticProps>) {
	return <ul>
		{
			examples.map(example => <li key={example.sys.id}>
				<p>{example.fields.title}</p>
				<p>{example.fields.description}</p>
				<p>{example.fields.rating} / 5</p>
			</li>)
		}
	</ul>
}

export const getStaticProps: GetStaticProps<{ examples: ExampleModelEntry[] }> = async () => {
	return {
		props: {
			examples: await exampleModel.getAll(),
		}
	}
}
```

## Conclusion

**About abstractions and the work required to create them**

By using time to design and create good abstractions, your code will be much easier to maintain, read and extend in the future. The work required to set up `createContentfulModel` in this article may seem like a lot. But consider the steps required now to add a new content type to your application.

1. Set up the new content type in your Contentful workspace.
2. Create a new model with `createContentfulModel` and only provide the schema for its fields and the content type id.
3. Add its types to `types/contentful.d.ts`
4. You’re ready to consume the data anywhere with the `.getAll()` method.

In addition to this, abstractions make your code easily extensible. Implementing other fetchers than the `getAll` fetcher will make them available for all content types by writing the code once. In the next article, we will examine extending this abstraction to work with Contentful images and rich text using the `context` object teased in this article.

## In the next article

Read the next article to examine how we’ll extend this abstraction. We’ll be creating

- Support for Contentful images
- Support for Rich Text

(Not yet published)