---
id: 1126279
title: "Smarter Next.js API routes with a custom createApiRoute function"
description: "The Next.js API Route API is extremely simple, which is well suited for many cases. However, it..."
path: "/jussinevavuori/smarter-nextjs-api-routes-with-custom-createapiroute-function-29l5"
url: "https://dev.to/jussinevavuori/smarter-nextjs-api-routes-with-custom-createapiroute-function-29l5"
commentsCount: 0
publicReactionsCount: 24
publishedTimestamp: 2022-06-28T08:36:23Z
positiveReactionsCount: 24
coverImage: "https://res.cloudinary.com/practicaldev/image/fetch/s--nR89K8H5--/c_imagga_scale,f_auto,fl_progressive,h_420,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/g57qu96j60f4dv8gmcd3.png"
socialImage: "https://res.cloudinary.com/practicaldev/image/fetch/s--uelNLG9J--/c_imagga_scale,f_auto,fl_progressive,h_500,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/g57qu96j60f4dv8gmcd3.png"
canonicalUrl: "https://dev.to/jussinevavuori/smarter-nextjs-api-routes-with-custom-createapiroute-function-29l5"
createdAt: 2022-06-28T08:36:23Z
editedAt: 2022-06-29T08:35:24Z
crosspostedAt: null
publishedAt: 2022-06-28T08:36:23Z
lastCommentAt: 2022-06-28T08:36:23Z
readingTimeMinutes: 9
tags: ["nextjs", "webdev", "javascript", "typescript"]
---

The `Next.js` API Route API is extremely simple, which is well suited for many cases. However, it leaves the developer to do all the work and problem solving when they require more complicated solutions, such as **middleware** or a **custom request context object** that may provide different things depending on the use case, such as database access or more. The API as is also provides no help when it comes to error handling, leaving the developer to do a lot of work for each route.


### Note on TypeScript


In this article I’m using TypeScript. All code presented in this article can also be used in JavaScript, just remove the types.


### GitHub


Follow the code and each of its steps in [this GitHub repo](https://github.com/jussinevavuori/create-api-route).


### Use the provided NPM package


You can also use the provided NPM package and install it with. The package is tested, comes with full TypeScript support and provides you all the features discussed in this article.


`npm install create-next-api-route`

[View `create-next-api-route` on NPM](https://www.npmjs.com/package/create-next-api-route)


## Coming up with a solution


The following example (TypeScript added) reads on the `Next.js` docs for API routes. It’s simple, effective, reasonable. However in reality it starts to become a bit of a hassle to manage all your methods with countless else ifs.


```tsx
// /pages/api/simple-endpoint.ts

import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
		res.json({ value: "🚀" });
  } else {
		res.json({ value: "❌" });
  }
}
```


To outsmart this, one of the first things that come to mind is resorting to a **switch statement** like the following.


```tsx
// /pages/api/switch-endpoint.ts

import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
	switch (req.method) {
		case "POST": {
			// Process a POST request
			return res.status(200).json({ message: "🤝🏻" });
		}
		case "GET": {
			// Process a GET request
			return res.status(200).json({ message: "🚀" });
		}
		default: {
			// All other methods
			return res.status(405).json({ message: "Method not allowed" });
		}
	}
}
```


It’s definitely an improvement, but a lot of the originally mentioned problems still exist.


### Adding middleware


Next up you realise you need your app to support middleware, such as `cors` , a request logger or other middleware. You might end up starting to type the following in every request handler. The following is even recommended on the API Routes documentation.


```tsx
// /pages/api/middleware-endpoint.ts

import type { NextApiRequest, NextApiResponse } from "next";
import Cors from "cors";

// From the Next.js API Routes documentation, with added TypeScript
// https://nextjs.org/docs/api-routes/api-middlewares
//
// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// Create the cors middleware
const cors = Cors({ methods: ["GET", "HEAD", "POST", "OPTIONS"] });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run the cors middleware before any of the event logic
  await runMiddleware(req, res, cors);

  res.json({ value: "🚀" });
}
```


This solution is ok, however it is extremely verbose and results in a lot of code duplication when the same middleware are required in multiple functions.


This much code already and there is no mention of a context object, error handling or anything else. Clearly, we need a better solution.


## The `createApiRoute` abstraction


The solution comes in the form of a `createApiRoute(...)` function. Our target is to allow the following API for creating an endpoint.


```tsx
// Example

import createApiRoute from "../utils/createApiRoute";
import requireUser from "../utils/requireUser";
import corsMiddleware from "../middleware/corsMiddleware"

export default createApiRoute({
	async get(req, res, ctx) {
		const user = await requireUser(req); // Throws on unauthenticated
		const todos = await ctx.db.getTodosForUser(user.id);

		res.json(todos);
	},
	async post(req, res, ctx) {
		const user = await requireUser(req); // Throws on unauthenticated
		const data = await todoSchema.parse(req.body); // Throws on invalid
		const todo = await ctx.db.createTodo(data);

		res.status(201).json(todo);
	},
	middleware: [
		corsMiddleware,
	]
})
```


That looks great. This abstraction comes with a lot of features:


- List of middleware
- Custom error handling, just throw from the function or middleware
- Custom context object provided for all handlers
- Separated functions for each method
- Automatic types, no more `import { NextApiRequest, NextApiResponse } from "next";`


This is just the top of the iceberg. Next up we start creating this abstraction and its full set of features.


## Creating the abstraction


Our target is to create a `createApiRouteCreator` function which returns us with a `createApiRoute` function, similar to the above example. We create a separate factory function to allow for more customisation and looser coupling. This enables us to do the following:


- Global middleware (unlike the previous example, the `corsMiddleware` function can be raised to be a global middleware function and to automatically run on all routes).
- Local middleware (like the previous example, we can have middleware that only runs on a specific endpoint).
- Global context object
- Custom error handling


### The simplest possible version


Let’s start by creating the simplest version of the abstraction. A function that allows us to use the separate handler functions for each HTTP method.


First off we create types to handle all allowed methods.


```tsx
// /lib/api/allowedMethods.ts

export type AllowedMethod = "get" | "post" | "patch" | "put" | "delete";

export function isAllowedMethod(arg: any): arg is AllowedMethod {
  return (
    arg === "get" ||
    arg === "post" ||
    arg === "patch" ||
    arg === "put" ||
    arg === "delete"
  );
}
```


Next up we create the `createApiRouteCreator` function which returns us with the `createApiRoute` function. For now, the only argument we pass to the `createApiRouteCreator` function is `unimplementedMethod` which defines the handler for when the method does not exist.


```tsx
// /lib/api/createApiRouteCreator.ts

import { NextApiRequest as Req, NextApiResponse as Res } from "next";
import { AllowedMethod, isAllowedMethod } from "./allowedMethods";

type CreateApiRouteCreatorArgs = {
  unimplementedMethod: (req: Req, res: Res) => any;
};

type CreateApiRouteArgs = {
  [method in AllowedMethod]?: (req: Req, res: Res) => any;
};

// The main constructor function which is used to construct our createApiRoute
// function.
export function createApiRouteCreator(args: CreateApiRouteCreatorArgs) {

  // The constructed createApiRoute function, which returns us with a handler
  // function that can be default exported from an API route.
  return function createApiRoute(options: CreateApiRouteArgs) {

    // The route handler
    return async function handler(req: Req, res: Res) {
      // Ensure method is an allowed method and use the correct handler.
      // If no handler
      const _method = req.method?.toLowerCase();

      // Use the correct handler based on the method or use the unimplemented
      // handler, when no handler available for method.
      const handler = isAllowedMethod(_method)
        ? options[_method] ?? args.unimplementedMethod
        : args.unimplementedMethod;

      // Run the handler
      await handler(req, res);
    };
  };
}
```


Now we can create our instance of the `createApiRoute` as follows.


```tsx
// /lib/api/createApiRoute.ts

import { createApiRouteCreator } from "./createApiRouteCreator";

export const createApiRoute = createApiRouteCreator({
  unimplementedMethod(req, res) {
    res.status(405).json({ message: "Unimplemented" });
  },
});
```


And use it in our endpoint


```tsx
// /pages/api/example.ts

import { createApiRoute } from "../../lib/api/createApiRoute";

export default createApiRoute({
  async get(req, res) {
    res.json({ value: "🚀" });
  },
  async post(req, res) {
    res.status(201).json({ message: "Thank you!" });
  },
});
```


It works! We can now use the `createApiRoute` as a simple abstraction that handles selecting the correct handler for us.


### Let’s add a global context object


To add the global context object, we need to add it as an argument for the `createApiRouteCreator` function. Even better, the context can be different depending on the request, as long as it conforms to its given type.


Let’s start by adjusting the types. This is a great use case for TypeScript generics.


```tsx
// /lib/api/createApiRouteCreator.ts

// ...

type CreateApiRouteCreatorArgs<Context> = {
  createContext(req: Req, res: Res): Context;
  unimplementedMethod: (req: Req, res: Res, ctx: Context) => any;
};

type CreateApiRouteArgs<Context> = {
  [method in AllowedMethod]?: (req: Req, res: Res, ctx: Context) => any;
};

// ...
```


Then we add it to the handler


```tsx
// /lib/api/createApiRouteCreator.ts

// ...

export function createApiRouteCreator<Context>(
  args: CreateApiRouteCreatorArgs<Context>
) {
  return function createApiRoute(options: CreateApiRouteArgs<Context>) {
    return async function handler(req: Req, res: Res) {
      // Create the context object
      const context = args.createContext(req, res);

			// ... get the handler function ...

      // Run the handler with context
      await handler(req, res, context);
    };
  };
}
```


Next we adjust our created `createApiRoute` function to include a context object which provides access to a database in this example. The database we use in this example is a quick fake todos database.


```tsx
// /lib/api/createApiRoute.ts

import { createApiRouteCreator } from "./createApiRouteCreator";
import { fakeDb } from "./fakeDb";

export const createApiRoute = createApiRouteCreator({
  unimplementedMethod(req, res) {
    res.status(405).json({ message: "Unimplemented" });
  },
  createContext() {
    return {
      db: fakeDb,
    };
  },
});
```


Now we can use it in the route


```tsx
// /pages/api/todo.ts

import { createApiRoute } from "../../lib/api/createApiRoute";

export default createApiRoute({
  async get(req, res, ctx) {
    const todos = await ctx.db.getTodosForUser("1");
    res.json(todos);
  },
});
```


### Adding middleware, both local and global


Let’s add support for local and global middleware. First off, we define a helper function to use middleware meant for `express` in our application.


```tsx
// /lib/api/initMiddleware.ts

import { NextApiRequest as Req, NextApiResponse as Res } from "next";

type Middleware = (req: any, res: any, next: (error?: any) => void) => void;

export default function initMiddleware(
  middleware: Middleware
): (req: Req, res: Res) => Promise<void> {
  return (req: Req, res: Res) =>
    new Promise((resolve, reject) => {
      middleware(req, res, (result) => {
        if (result instanceof Error) {
          return reject(result);
        }
        return resolve(result);
      });
    });
}
```


Next we add options in the `createApiRouteCreator` for global middleware and `createApiRoute` for local middleware.


```tsx
// /lib/api/createApiRouteCreator.ts

type CreateApiRouteCreatorArgs<Context> = {
	// ...
  middleware?: Array<(req: Req, res: Res) => Promise<void>>;
};

type CreateApiRouteArgs<Context> = {
  [method in AllowedMethod]?: (req: Req, res: Res, ctx: Context) => any;
} & {
  middleware?: Array<(req: Req, res: Res) => Promise<void>>;
};
```


And call all middleware in the route handler


```tsx

// /lib/api/createApiRouteCreator.ts

// ...
export function createApiRouteCreator<Context>(
  args: CreateApiRouteCreatorArgs<Context>
) {
  return function createApiRoute(options: CreateApiRouteArgs<Context>) {
    return async function handler(req: Req, res: Res) {
      // Get all global and local middleware
      const middleware = [
        ...(args.middleware ?? []),
        ...(options.middleware ?? []),
      ];

      // Run each middleware in sequence
      for await (const mw of middleware) {
        await mw(req, res);
      }

			// ...
    };
  };
}
```


We can now apply global middleware as follows, such as enabling cors and a custom logger.


```tsx
// /lib/api/createApiRoute.ts

import initMiddleware from "./initMiddleware";
import Cors from "cors";
import { NextApiRequest } from "next";

// Define new middleware
const corsMiddleware = initMiddleware(Cors());
const loggerMiddleware = async (req: NextApiRequest) => {
  console.log("Incoming", req.method, "request");
};

export const createApiRoute = createApiRouteCreator({
	// ...
	// Apply global middleware
  middleware: [corsMiddleware, loggerMiddleware],
});
```


And local middleware


```tsx
// /lib/api/example.ts

import { createApiRoute } from "../../lib/api/createApiRoute";

export default createApiRoute({
	// ...
	middleware: [
		async (req, res) => {
			console.log("Called local middleware");
		}
	]
});
```


### Let’s add custom error handling


Let’s also address one of our biggest pain points when creating APIs. Error handling. We tackle the issue by allowing the user to add a custom error handler function as an argument to `createApiRouteCreator` which handles all errors in a user-defined way.


First we add the option to add an error handler to our `createApiRouteCreator` function. We then proceed by wrapping our entire `handler` function body in a `try catch` block and call the error handler in the catch block. (Note: if no error handler is defined, all errors will go uncaught).


```tsx
// /lib/api/createApiRouteCreator.ts

type CreateApiRouteCreatorArgs<Context> = {
	// ...
	handleError?: (req: Req, res: Res, error: unknown) => void;
};

// ...
export function createApiRouteCreator<Context>(
  args: CreateApiRouteCreatorArgs<Context>
) {
  return function createApiRoute(options: CreateApiRouteArgs<Context>) {
    return async function handler(req: Req, res: Res) {
      try {
        // ...
      } catch (error: unknown) {
				// If an error handler exists, call it
        args.handleError?.(req, res, error);
      }
    };
  };
}

```


We can then define our custom error handler as follows


```tsx
// /lib/api/createApiRoute.ts

export const createApiRoute = createApiRouteCreator({
	// ...
  handleError(req, res, error) {
    if (typeof error === "string") {
      return res.status(400).send({ message: error });
    }

    res.status(400).send({ message: "Something wen't wrong!" });
  },
});
```


Now we can throw errors in peace from our handlers. In the above example we allow throwing strings. This may not be a good practice, however provides a simple example. Let’s define a helper function to illustrate our example.


```tsx
// /lib/api/requireUser.ts

import { NextApiRequest } from "next";

export async function requireUser(req: NextApiRequest) {
  const didFindUser = await new Promise<boolean>((r) => r(Math.random() < 0.5));

  if (!didFindUser) {
    throw "Unauthenticated";
  }

  return { id: "1" };
}
```


We can call this utility function which simply throws an error on unauthenticated, otherwise returns a user. In addition we can throw any custom errors, such as for validation.


```tsx
// /pages/api/example.ts

// ...
import { requireUser } from "../../lib/api/requireUser";

export default createApiRoute({
  async get(req, res, ctx) {
    const user = await requireUser(req);
    const todos = await ctx.db.getTodosForUser(user.id);

    res.json({ todos });
  },
  async post(req, res) {
    if (typeof req.body !== "string" || req.body === "") {
      throw "Request body not a string or empty string";
    }

    res.status(201).json({ message: "Thank you!" });
  },
	// ...
});
```


## Finishing comments


There we have it. A beautiful API that solves many problems developers face with the simple Next.js API routes. Error handling, middleware, context objects, if-else chains and switch statements.


However, this idea can be expanded upon and more features can easily be added on top of this abstraction. For example hooks that run before and after your request is handled, middleware that is specific to a single method, protected routes that automatically throw errors for unauthenticated errors and provide the user object in the context. The list goes on and depends a lot on the use case.


Already in this form, we have reduced a lot of code duplication and made the code much more expressive and declarative instead of imperative and unDRY.


If you use this abstraction or have any more ideas on how to expand on this, please do feel free to contact me!