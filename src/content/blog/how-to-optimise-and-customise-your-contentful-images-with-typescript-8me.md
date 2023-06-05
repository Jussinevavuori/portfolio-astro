---
id: 1166060
title: "How to optimise and customise your Contentful images with TypeScript"
description: "ImageSrc function for Contentful images with TypeScript   All code provided as an npm..."
path: "/jussinevavuori/how-to-optimise-and-customise-your-contentful-images-with-typescript-8me"
url: "https://dev.to/jussinevavuori/how-to-optimise-and-customise-your-contentful-images-with-typescript-8me"
commentsCount: 0
publicReactionsCount: 5
publishedTimestamp: 2022-08-12T14:16:30Z
positiveReactionsCount: 5
coverImage: "https://res.cloudinary.com/practicaldev/image/fetch/s--uVXBS-oR--/c_imagga_scale,f_auto,fl_progressive,h_420,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/cm4u82ijn7auyk17703w.png"
socialImage: "https://res.cloudinary.com/practicaldev/image/fetch/s--4FmdrsLf--/c_imagga_scale,f_auto,fl_progressive,h_500,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/cm4u82ijn7auyk17703w.png"
canonicalUrl: "https://dev.to/jussinevavuori/how-to-optimise-and-customise-your-contentful-images-with-typescript-8me"
createdAt: 2022-08-12T14:16:31Z
editedAt: null
crosspostedAt: null
publishedAt: 2022-08-12T14:16:30Z
lastCommentAt: 2022-08-12T14:16:30Z
readingTimeMinutes: 5
tags: ["typescript", "javascript", "contentful"]
---

# ImageSrc function for Contentful images with TypeScript

All code provided as an [npm package](https://www.npmjs.com/package/contentful-image)

```bash
npm install contentful-image
```

Or use code provided in [the GitHub repo](https://github.com/Jussinevavuori/contentful-image).

Using the [Contentful npm package](https://www.npmjs.com/package/contentful) you can access an image stored in a content entry with the following snippet.

```tsx
<image src={contentEntry.fields.yourImage.fields.file.url} />
```

However, **this method does not support** changing image formats, resizing, cropping and many more. This method only allows you to access the base unoptimised image you originally uploaded to Contentful.

But what if you wanted **optimized images** for your web applications in a modern way? That’s where the [Contentful Images API](https://www.contentful.com/developers/docs/references/images-api/) comes to play!

The Contentful Images API allows you to

- Change the image format (jpg, png, webp, gif, avif, progressive jpg, 8-bit png)
- Resize to specified width and height
- Resize with different behaviours (pad, fill, scale, crop, thumb)
- Specify a focus area for resizing (a specific position or faces)
- Crop rounded corners, circles and ellipsis
- Change the quality of the image (between 1 - 100)
- Change the background color

All of this is done by appending query parameters to the file url. Let’s see how we can create a `contentfulImage` function in TypeScript to help us access files and apply these parameters with less manual labour. Our target is to create an easier way to retrieve images with theses options, such as shown below

```tsx
<image src={contentfulImage(contentEntry.fields.yourImage, {
	quality: 60,
  height: 400,
  format: "webp",
})} />
```

## The TypeScript part: Creating types for the image API

First off let’s create an empty `contentfulImage` function. Our aim is to take as input a Contentful image and options and return a URL (with the appended query parameters) that can be used as is for example with a `<image />` in the `src`.

```tsx
function contentfulImage(
	src: ContentfulImageSource,
	options: ContentfulImageOptions = {}
): string {
	return "";
}
```

Let’s define the type of the `ContentfulImageSource` as a type that can accept an URL directly or any field (or subfield) in a Contentful image. It can then be used as either `contentfulImage(contentEntry.myImageField)` or by any subfield such as `contentfulImafge(contentEntry.myImageField.fields.file.url)`.

```tsx
export type ContentfulImageSource =
  | string
  | { url: string }
  | { file: { url: string } }
  | { fields: { file: { url: string } } };
```

Next, let’s create types for each option that can be defined via the Contentful Images API. In reality, we only read their API and convert all values from there into types as follows. In addition to this we also create a type for an object which contains all of these properties as optional properties with readable keys.

```tsx
export type ContentfulImageOptionsFormat =
  | "jpg"
  | "png"
  | "webp"
  | "gif"
  | "avif"
  | "jpg/progressive"
  | "png/png8";
export type ContentfulImageOptionsFit =
  | "pad"
  | "fill"
  | "scale"
  | "crop"
  | "thumb";
export type ContentfulImageOptionsFocusArea =
  | "center"
  | "top"
  | "left"
  | "right"
  | "bottom"
  | "top_right"
  | "bottom_right"
  | "top_left"
  | "bottom_left"
  | "face"
  | "faces";
export type ContentfulImageOptionsHeight = number;
export type ContentfulImageOptionsWidth = number;
export type ContentfulImageOptionsRadius = number | "max";
export type ContentfulImageOptionsQuality = number;
export type ContentfulImageOptionsBackgroundColor = string;

export type ContentfulImageOptions = {
  format?: ContentfulImageOptionsFormat;
  width?: ContentfulImageOptionsWidth;
  height?: ContentfulImageOptionsHeight;
  fit?: ContentfulImageOptionsFit;
  focusArea?: ContentfulImageOptionsFocusArea;
  radius?: ContentfulImageOptionsRadius;
  quality?: ContentfulImageOptionsQuality;
  backgroundColor?: ContentfulImageOptionsBackgroundColor;
};
```

## Getting the base URL from the src object

We write the following function to extract the URL from the given `src` object no matter how deeply nested it is in there with a ternary that could use some prettying up. We also prepend “https:” if necessary as it is not always provided by Contentful. In addition, if for any reason there is a query string appended to the url, we remove it.

```tsx
export function getContentfulImageSrcUrl(src: ContentfulImageSource) {
  // Get provided raw URL string
  let url =
    typeof src === "string"
      ? src
      : "fields" in src
      ? src.fields.file.url
      : "file" in src
      ? src.file.url
      : src.url;

  // Prepend https: if necessary
  if (url.startsWith("//")) url = "https:" + url;

  // Remove query
  if (url.includes("?")) url = url.split("?")[0];

  return url;
}
```

## The hard part: Converting the options object into a query string

We can not simply match each option to a query parameter and pass the value as is. We must have support for the following limitations:

- Some options may be defined by more than one query parameter (such as 8-bit pngs which are retrieved with two options: `fm=png` and `fl=png8`.
- We want to apply transformers to some properties before applying them to the query string, such as with background color. The query requires a value such as `rgb:9090ff` but we want to be able to provide simply `9090ff` or `#9090ff` to our function.

We have already started to implement the first requirement. Our `ContentfulImageOptionsFormat` defines 8-bit pngs with the type `png/png8` and progressive jpgs `jpg/progressive`. When split at `/`, these values match the exact values that should be provided to the two required query parameters, `fm` and `fl` in that order.

Let’s define a map of all properties that can be specified by the consumer of the API and a list of query parameters each option should define.

```tsx
const optionQueryKeys: Record<keyof ContentfulImageOptions, string[]> = {
  backgroundColor: ["bg"],
  quality: ["q"],
  radius: ["r"],
  focusArea: ["f"],
  fit: ["fit"],
  height: ["h"],
  width: ["w"],
  format: ["fm", "fl"],
};
```

There. All other options define a single option, except for the image format. We’ll come back later on how we are to apply this data structure.

While we’re at it, let’s also create a map of transformers. These are functions that take in the value provided by the consumer after being stringified but before any other operations are done to it. For now, only background color will have a transformer that omits the “#” character and prepends the `rgb:` string required by the api.

```tsx
const transformers: Partial<
  Record<keyof ContentfulImageOptions, (value: string) => string>
> = {
  backgroundColor: (value) => "rgb:" + value.replace("#", ""),
};
```

Let’s create a `getContentfulImageQuery` function which has one purpose. Take in a `ContentfulImageOptions` object and return a query string if any was constructed.

The function will proceed as follows:

- For each entry specified in the options:
    - Get list of query keys from the `optionQueryKeys` object for this option
    - Convert values to string, apply transformer function if any exists and split to list of values at `"/"`.
    - Match each query key and value in their respective lists by index and if both have a value, append the query key and value to the query string.

A functional implementation of this is as follows.

```tsx
export function getContentfulImageQuery(options: ContentfulImageOptions) {
  return Object.entries(options)
    .map(([key, value]) => {
      // Get list of all parameter names for current option
      const queryKeys = optionQueryKeys[key as keyof ContentfulImageOptions];

      // Get transformer for preprocessing before applying to query if exists.
      const transformer = transformers[key as keyof ContentfulImageOptions];

      // Convert value to string, apply transformer if exists and split
      // into list of values at "/".
      const values = (
        transformer ? transformer(value.toString()) : value.toString()
      ).split("/");

      // By index, match each parameter name and value to a "{name}={value}"
      // pair. If either the name or value for a pair is falsy, omit it.
      return queryKeys
        .map((name, i) => {
          if (!name || !values[i]) return "";
          return name + "=" + values[i];
        })
        .filter((_) => !!_); // Remove all empty values
    })
    .flat() // Flatten array
    .join("&"); // Join all {name}={value} pairs with "&" to a query string.
}
```

## Combining the src and options

Now that we have `getContentfulImageSrcUrl` and `getContentfulImageQuery`, combining them into the final function is practically trivial.

```tsx
export default function contentfulImage(
  src: ContentfulImageSource,
  options: ContentfulImageOptions = {}
) {
  // Get URL from src and query from options.
  const url = getContentfulImageSrcUrl(src);
  const query = getContentfulImageQuery(options);

  // Append query if one constructed
  return url + (query ? `?${query}` : "");
}
```

## There you have it.

There. Now you can use `contentfulImage()` anywhere in your code. The links to the GitHub repo and npm package (and its installation instructions) are provided at the start of this article. Feel free to use them as you wish.