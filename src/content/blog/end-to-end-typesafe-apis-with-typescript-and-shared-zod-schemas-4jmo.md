---
id: 1135452
title: "End-to-end Typesafe APIs with TypeScript and shared Zod schemas"
description: "Validating your data is absolutely necessary. The data could be data fetched from an API, data posted..."
path: "/jussinevavuori/end-to-end-typesafe-apis-with-typescript-and-shared-zod-schemas-4jmo"
url: "https://dev.to/jussinevavuori/end-to-end-typesafe-apis-with-typescript-and-shared-zod-schemas-4jmo"
commentsCount: 0
publicReactionsCount: 10
publishedTimestamp: 2022-07-18T08:07:57Z
positiveReactionsCount: 10
coverImage: "https://res.cloudinary.com/practicaldev/image/fetch/s--id6YAzI0--/c_imagga_scale,f_auto,fl_progressive,h_420,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/uk5zx81vw8u06vu43nax.png"
socialImage: "https://res.cloudinary.com/practicaldev/image/fetch/s--eLzMRoHO--/c_imagga_scale,f_auto,fl_progressive,h_500,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/uk5zx81vw8u06vu43nax.png"
canonicalUrl: "https://dev.to/jussinevavuori/end-to-end-typesafe-apis-with-typescript-and-shared-zod-schemas-4jmo"
createdAt: 2022-07-08T14:13:53Z
editedAt: null
crosspostedAt: null
publishedAt: 2022-07-18T08:07:57Z
lastCommentAt: 2022-07-18T08:07:57Z
readingTimeMinutes: 7
tags: ["typescript", "javascript", "webdev"]
---

**Validating your data is absolutely necessary.** The data could be data fetched from an API, data posted to the API in the request body or any other IO operation. This article will present a method of using TypeScript and Zod to create shared schemas between your frontend and backend. Shared schemas will allow not only achieving the required level of data validation but also provide tooling such as automatically generated shared types that greatly increase productivity!

Let’s create the simplest possible todo app, going through each line of code relevant to data validation.

**[Follow the code on GitHub](https://github.com/Jussinevavuori/typesafe-apis-with-zod)**, where I have posted a simple example of this app created with Next.js

## Why use Zod?

You can use any other validation library, such as the other popular three-letter options, [yup](https://github.com/jquense/yup) or [joi](https://www.npmjs.com/package/joi). **I strongly recommend choosing Zod**, as it in my opinion provides a great set of utilities, supports practically every type you could wish to support, has great TypeScript support and a short, easy to remember API.

Especially for people used to TypeScript types, Zod schemas really do their best at making them feel like regular TypeScript schemas. For example, all object properties are required unless explicitly marked as `.optional()` or `.nullable()`, similar to how TypeScript types require explicitly declaring a property as optional with `?`, `| undefined` or `| null`. With other data validation libraries, you might always have to remember to type `.string({ required: true })` which just doesn’t feel as natural.

## Defining a schema and its auto-generated types

Let’s create a simple Todo app to illustrate how Zod is used both in the backend and the frontend. Let’s first define a schema for a todo item. We declare a Zod object schema with the `z.object()` method. We can then define each property and its types, each of which can then be refined further with chained methods of those types.

**The important part** of defining a schema to reach maximum typesafety is to **share it between your frontend and backend**. This could be done with for example an internal npm package or a monorepo. In some cases, such as with Next.js, you just place the schema for example in a folder such as `/lib/schemas` and it’s automatically reachable by both your frontend and backend code. Doing this prevents any need for duplicating the schema and maintaining two identical schemas. (Again, an easy source of bugs: *“I’ll just quickly change this property to optional…”* might be a sentence you hear yourself saying and then forget to change the other copy of the schema).

```tsx
import { z } from "zod";

export const todoSchema = z.object({
	id: z.string(),
	done: z.boolean(),
	text: z.string().min(1), // min(1) disallows empty strings
	important: z.boolean().optional(), 
	createdAt: z.string(),
	updatedAt: z.string(),
})

// For later purposes, we also define a schema for an array of todos
export const todosSchema = z.array(todoSchema);
```

Next we define a type for todos. Regularly you might start creating a type that matches the schema with `export type Todo = { done: boolean; ... }`, however that is not only unnecessary but also unproductive as it requires you maintain two versions of the same schema. Instead you can **use Zod to autogenerate the schema by type inference** (which Zod happens to be very good at).

```tsx
// .../schemas/todo.schema.ts
export type Todo = z.TypeOf<typeof todoSchema>;
```

**Protip:** Instead of exporting these types, you can optionally declare the following type in your `types.d.ts` file or any other `.d.ts` file that is included in your `tsconfig.json`. **Doing this means you don’t ever again need to import your types with** `import { Todo } from "path/to/todo"`. However declaring types this way means you have to import all dependencies inline. Little ugly, but useful in the long run in my opinion.

```tsx
// types.d.ts
type Todo = import("zod").TypeOf<
  typeof import("./lib/schemas/todo.schema")["todoSchema"]
>;
```

To reflect on the power of shared schemas combined with automatically inferred types: without them, you would have to keep one copy of the both the schema and the interface in your backend and your frontend, which would result in a total of four different schemas defining the exact same thing, each one requiring to be updated when any update is required.

## Typesafe fetching with your new schema and types!

Let’s start implementing the API to serve the todos and the frontend functions required to consume them! We create a simple endpoint to serve all todos.

```tsx
export default async function handler(req: Request, res: Response) {
	if (req.method === "GET") {
		const todos = await getAllTodosFromDatabase();
		res.json(todos);
	}
}
```

The **old way** of fetching this data in a typesafe manner would involve **typecasting**. Some typechecking with `if (data !== null)` or `if (typeof data === "object")` or multiple other longwinded ways of attempting to validate your data might be present and should automatically signal to the developer that a better solution is required.

```tsx
// BAD!
async function fetchTodos(): Promise<Todo[]> {
	const response = await fetch("/api/todos");
	const json = await response.json();
	return json as Todo[];
}
```

**Doing this would be an easy source of bugs**. You assume your backend delivers objects of a certain shape. Suddenly the array doesn’t even exist, all the objects within it are null, or some of the objects might have a missing `id` property. You don’t know and you can’t trust until you validate. This is where the schema comes into play.

**Validating your data**, without any typecasting and with a lot more confidence in your own code can be achieved with **just a few lines of code.**

```tsx
// Good.
async function fetchTodos(): Promise<Todo[]> {
	const response = await fetch("/api/todos");
	const json = await response.json();

	const parsed = todosSchema.safeParse(json);
	if (parsed.success) {
		return parsed.data;
	}

	// Handle errors
	console.error(parsed.error)
	return [];
}
```

Using the `safeParse` method, we can easily validate that the data has the correct shape and return it as is, **no typecasting necessary** - Zod handles typing for you. In case there is an error, `parsed.success` will be false and the `parsed.error` property will contain the resulting error. **Handling errors is left as an exercise to the reader**, however returning an empty array as a default value and logging the error is a start.

There! We now have a simple API to serve data of the correct type and a client function to fetch it with validation. Simple as that!

## Updating and creating a todo item

Let’s next tackle the reverse direction: the server validating data received from the client. Again, we can define new shared schemas. This time the schemas define the shape of the object sent as the request body to the API. They can then be used for both validating on the server and defining the correct shape on the frontend. Let’s create schemas for updating and creating todo items (with automatically inferred types).

```tsx
// lib/schemas/todo.schema.ts

export const todoUpdateSchema = z.object({
  id: z.string(),
  done: z.boolean(),
});

export const todoCreateSchema = z.object({
  text: z.string(),
  important: z.boolean(),
});

export type TodoUpdate = z.TypeOf<typeof todoUpdateSchema>;
export type TodoCreate = z.TypeOf<typeof todoCreateSchema>;
```

Let’s next define simple handlers in the endpoint for these methods.

```tsx
// pages/api/todos.ts

export default async function handler(req: Request, res: Response) {
	// ...
  if (req.method === "PATCH") {
    const body = todoUpdateSchema.parse(req.body);
    updateTodoInDatabase(body.id, body.done);
    return res.status(200).end();
  }

  if (req.method === "POST") {
    const body = todoCreateSchema.parse(req.body);
    createTodoInDatabase(body);
    return res.status(200).end();
  }
}
```

Here instead of using the `safeParse()` method, we use a more direct method - the `parse()` method. **`parse()` returns the validated data in its correct shape and throws on invalid data.** Sometimes this is preferred, as it results in fewer lines and easier-to-read code but leaves the error handling to be done in a catch-block. For example on a server, where errors may be handled by a common error handler function, this could be a good option (or if you just prefer `try { schema.parse(json) } catch (e) { }` instead of `const parsed = schema.safeParse(json); if (parsed.success) { } else { }`!

Consuming these routes on the frontend is as easy as defining the following functions, the types of which are conveniently available already and the exact same types which the backend uses.

```tsx
async function createTodo(body: TodoCreate) {
	await fetch("/api/todos", {
		body: JSON.stringify(body),
		headers: { "Content-type": "application/json" },
		method: "POST",
	})
}

async function updateTodo(body: TodoUpdate) {
	await fetch("/api/todos", {
		body: JSON.stringify(body),
		headers: { "Content-type": "application/json" },
		method: "PATCH",
	})
}
```

## Let’s review

We’re done now! All that’s left to do is hook up the `updateTodo`, `createTodo` and `fetchTodos` functions to the frontend code and to expand upon this idea.

The steps:

1. **Create a schema with Zod** *(shared between frontend and backend code)*
2. **Get automatic types with Zod’s `z.TypeOf<typeof schema>` type inference** *(also shared)*
3. **Validate data when fetching data or posting data to the server** *(use `.parse()` or `.safeParse()` according to your liking)*

And the results:

- **Automatically generated types**
- **Shared schemas and types between frontend and backend code**
- **Full confidence in your data’s validity**
- **Complete data validation with just a few lines of code**
- **No maintaining symmetric schemas and types in multiple places**

The code shown in this article is obviously the bare minimum code of the simplest possible example, but expanding this to larger applications is not only easy but quite honestly a necessity. No application larger than a todo app created for learning a new JS framework should ever communicate data that has not been validated. Moreover, attempting to validate data without shared Zod schemas is just extra work and can even serve as a potential source of bugs.