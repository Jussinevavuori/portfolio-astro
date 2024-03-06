---
id: 1170324
title: "Rich text and images with Contentful, Next.js and Zod"
description: "The previous article demonstrated how we can create models in our codebase for our existing..."
path: "/jussinevavuori/rich-text-and-images-with-contentful-nextjs-and-zod-5684"
url: "https://dev.to/jussinevavuori/rich-text-and-images-with-contentful-nextjs-and-zod-5684"
commentsCount: 1
publicReactionsCount: 1
publishedTimestamp: 2022-08-18T09:09:00Z
positiveReactionsCount: 1
coverImage: "https://media.dev.to/cdn-cgi/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fy1xkldadvbc76ey1k8e7.png"
socialImage: "https://media.dev.to/cdn-cgi/image/width=1000,height=500,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fy1xkldadvbc76ey1k8e7.png"
canonicalUrl: "https://dev.to/jussinevavuori/rich-text-and-images-with-contentful-nextjs-and-zod-5684"
createdAt: 2022-08-18T09:09:32Z
editedAt: 2022-08-18T09:10:08Z
crosspostedAt: null
publishedAt: 2022-08-18T09:09:00Z
lastCommentAt: 2023-05-29T11:41:40Z
readingTimeMinutes: 4
tags: ["javascript", "webdev", "typescript"]
---

The previous article demonstrated how we can create models in our codebase for our existing Contentful models to fetch them and interact with them in a fully typesafe manner. We also hinted at how we’re going to work with **images and rich text**, and what the context object in the previous tutorial will do.

## Read more

**[Read the previous article](https://dev.to/jussinevavuori/using-contentful-with-nextjs-part-1-2i0a)**

In the previous article we explored creating the `createContentfulModel` function that provides a useful abstraction for working with Contentful models.

**[How to optimise and tweak Contentful images](https://dev.to/jussinevavuori/how-to-optimise-and-customise-your-contentful-images-with-typescript-8me)**

In this article we’re going to explore how we can create a `contentfulImage` function which allows us to automatically fetch our images in optimised next-gen formats and more.

## Setting up schemas for Contentful images and rich text

Contentful image fields are regular Contentful entries. We’ll create a schema for the fields of an image and the image entry itself using the `contentfulEntrySchema` we created in the previous article.

```tsx
import { z } from "zod";
import { contentfulEntrySchema } from "./contentfulEntrySchema";

export const contentfulImageFieldsSchema = z.object({
  title: z.string(),
  description: z.string(),
  file: z.object({
    url: z.string(),
    details: z.object({
      size: z.number().positive().int(),
      image: z.object({
        width: z.number().positive().int(),
        height: z.number().positive().int(),
      }),
    }),
    fileName: z.string(),
    contentType: z.string(),
  }),
});

export const contentfulImageField = () =>
  contentfulEntrySchema.extend({
    fields: contentfulImageFieldsSchema,
  });
```

We’re also going to setup a type for our rich text fields. For now, we’re going to take a shortcut and simply use a typecast with a zod transform and not perform any actual data validation as the shape of Contentful rich text is very complicated.

```tsx
import { z } from "zod";
import { RichTextContent } from "contentful";

export const contentfulRichTextField = () =>
  z.any().transform((x) => x as RichTextContent);
```

## Providing all custom Contentful fields using the context object

Now is time to reveal what we were intending to do with the context object all along. (Note: the context object can be extended to do much more than only provide custom fields but we’re going to start with this).

The context object will contain a `contentfulFields` property which will in turn contain both the schemas we defined. The type of the context will be updated to the following.

```tsx
export type CreateContentfulModelContext = {
  contentfulFields: {
    richText: typeof contentfulRichTextField;
    image: typeof contentfulImageField;
  };
};
```

Now, in our `createContentfulModel` we must create the context and provide in to the `fieldsSchemaCreator` function.

```tsx
// ... more imports
import { contentfulImageField } from "./contentful-image-field";
import { contentfulRichTextField } from "./contentful-rich-text-field";

// ... types

export function createContentfulModel<TDataIn extends {}, TDataOut>(
	contentType: string,
	fieldsSchemaCreator: FieldsSchemaCreator<TDataIn, TDataOut>
) {

	// Set up context
	const context: CreateContentfulModelContext = {
    contentfulFields: {
      richText: contentfulRichTextField,
      image: contentfulImageField,
    },
  };

	// Provide context to fields schema creator
	const fieldsSchema = fieldsSchemaCreator(context);

	// ... Rest of the function
}
```

Now all fields schema creator functions have access to the newly created field types. Let’s next see how we can use them.

## Using the image and rich text field types

Let’s update our example model to contain an image and rich text using the new fields from the context object.

```tsx
import { z } from "zod";
import { createContentfulModel } from "./create-contentful-model";

export const exampleModel = createContentfulModel("example", (ctx) => z.object({
	title: z.string(),
	description: z.string().optional(),
	rating: z.number().int().positive(),
	body: ctx.contentfulFields.richText(),
	image: ctx.contentfulFields.image(),
}));
```

There. That’s all there is to it.

## Consuming rich text and images

First let’s create a new rich text component that takes `RichTextContent` as a prop. For this we’re going to use `@contentful/rich-text-react-renderer` which you can install with

```bash
npm i @contentful/rich-text-react-renderer
```

The component is simple and shown below and simply uses the `documentToReactComponents` method wrapped in an `<article>`. However, customising any rich text can now be done in a single place.

```tsx
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { RichTextContent } from "contentful"

export interface RichTextProps {
	content?: RichTextContent;
}

export function RichText(props: RichTextProps) {
	return <article>
		{documentToReactComponents(props.content as any)}
	</article>
}
```

Consuming images is simple as the image itself contains the URL of the file which can be directly used as the `src` for the image. Similarly it contains a title for the `alt`.

Let’s update our simple React application to render both the image and the rich text content.

```tsx
<ul>
		{
			examples.map(example => (
				<li key={example.sys.id}>
					<img
						src={example.fields.image.fields.file.url}
						alt={example.fields.image.fields.title}
					/>
					<p>{example.fields.title}</p>
					<p>{example.fields.description}</p>
					<p>{example.fields.rating} / 5</p>
					<RichText content={example.fields.body} />
				</li>
			))
		}
	</ul>
```

[Read this article to optimize and tweak your Contentful images](https://dev.to/jussinevavuori/how-to-optimise-and-customise-your-contentful-images-with-typescript-8me). Replace your `src={entry.fields.image.fields.file.url}` with the improved `src={contentfulImage(entry.fields.image, { format: "webp", quality: 60 })}` for example using the methods or package described in the article or directly install `contentful-image` with

```tsx
npm i contentful-image
```

## That’s it.

Thank you for taking the time to read this article, hopefully it is of use to you!