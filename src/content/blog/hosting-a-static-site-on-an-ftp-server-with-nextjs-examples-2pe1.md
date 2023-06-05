---
id: 1147560
title: "Hosting a static site on an FTP server with Next.js examples"
description: "When building a statically generated site (SSG site) using Next.js or any other SSG framework, such..."
path: "/jussinevavuori/hosting-a-static-site-on-an-ftp-server-with-nextjs-examples-2pe1"
url: "https://dev.to/jussinevavuori/hosting-a-static-site-on-an-ftp-server-with-nextjs-examples-2pe1"
commentsCount: 0
publicReactionsCount: 8
publishedTimestamp: 2022-07-25T10:24:35Z
positiveReactionsCount: 8
coverImage: "https://res.cloudinary.com/practicaldev/image/fetch/s--hUuMcUTI--/c_imagga_scale,f_auto,fl_progressive,h_420,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/nx6am6rd23mlwm5lmq00.png"
socialImage: "https://res.cloudinary.com/practicaldev/image/fetch/s--llv5YBex--/c_imagga_scale,f_auto,fl_progressive,h_500,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/nx6am6rd23mlwm5lmq00.png"
canonicalUrl: "https://dev.to/jussinevavuori/hosting-a-static-site-on-an-ftp-server-with-nextjs-examples-2pe1"
createdAt: 2022-07-21T09:56:27Z
editedAt: null
crosspostedAt: null
publishedAt: 2022-07-25T10:24:35Z
lastCommentAt: 2022-07-25T10:24:35Z
readingTimeMinutes: 5
tags: ["javascript", "nextjs", "devops"]
---

When building a **statically generated site (SSG site)** using Next.js or any other SSG framework, such as Hugo, Gatsby, Jekyll or Nuxt you might find yourself wanting to **host the generated static files** on an **FTP server**. Be the reason your own solution or a client requirement, this article will show you how to do it. Our target is to build a script that will enable you to simply run a single npm script to build and deploy the project to a FTP server.

```tsx
$ npm run deploy
```

## What kind of content can you host?

Using this method, you can host any **static sites**, which consist of static HTML, JavaScript and CSS files, or other static assets. The static pages may be handwritten from scratch or generated with any SSG framework. Any **dynamic content** must be either fetched client-side or the site must be regenerated and redeployed when content changes.

**In this article** I will be using Next.js as an example. If you are not using Next.js, the article will point out those steps which you need to adapt to your own framework.

## What is FTP?

You’re going to need an **FTP server**. FTP stands for **File Transfer Protocol**, which is essentially sort of like HTTP, but for transmitting files between computers. [You can read more about FTP here](https://www.techtarget.com/searchnetworking/definition/File-Transfer-Protocol-FTP). You can connect to a remote FTP server directly with a FTP client such as FileZilla or Commander One. Those provide a graphical user interface for manually uploading and downloading files. While you could by all means use an FTP client, our target is to write a script that allows uploading your entire project to the FTP server using one single command: `npm run deploy`

## Step 1: Build your project

Let’s start off by initializing an empty `deploy` script in our `package.json`.

```tsx
{
	 ...
	"scripts": {
		...
		"deploy": ""
	},
	...
}
```

The first step for our deployment script is to build the project to static files. Using Next.js we must run two commands: `next build` and `next export`. In the case of Next.js it will generate our exported static files into a `/out` directory by default.

Let’s write those as the first instructions for our deployment script.

```tsx
"scripts": {
  "deploy": "next build && next export"
}
```

**For other frameworks:** Replace `next build && next export` with any commands that builds your project to static files into some output directory, such as `npm run build`. For projects where no build step is required (manually writing static files), this step can be omitted.

## Step 2: Setup custom JavaScript script for deploying

Create a directory `/scripts` where we’ll create a file: `deploy.js` for deploying. *(Note: if you encounter problems running the script, attempt changing the filetype to `deploy.mjs`).*

Let’s just initialise it with an empty async main function for now.

```tsx
async function main() {

	return 0;
}

main().then(code => process.exit(code));
```

This deployment script will handle all the rest of the deployment procedures after we have built the project so we can hook it up to the npm script to complete it as follows.

```tsx
"scripts": {
  "deploy": "next build && next export && node ./scripts/deploy.js"
}
```

## Step 3: Setup a .env file with your FTP credentials

You’ll need credentials to connect into an FTP server. Let’s save the FTP host, port, username and password into our `.env` file for later use. The port 21 is commonly used for FTP.

```tsx
FTP_USER=your-username-here
FTP_PASS=your-password-here
FTP_HOST=your.hostname.here
FTP_PORT=21
```

## Step 4: Flesh out the deployment script

Let’s start up by installing the dependencies required for the script by running

```tsx
$ npm i -D dotenv ftp-deploy
```

And import those at the top of your script

```tsx
import dotenv from "dotenv";
import FtpDeploy from "ftp-deploy";

dotenv.config({ path: "./.env" });
```

And let’s fill out the deployment script. Most of the heavy lifting will be done by `ftp-deploy`. Feel free to customise any settings for the deployment to better suit your needs. This configuration is the one I’ve used for uploading all Next.js build files to the root of an FTP server.

```tsx
import dotenv from "dotenv";
import FtpDeploy from "ftp-deploy";

dotenv.config({ path: "./.env" });

async function main() {
  try {
		// Replace "/out" with your build directory which contains all generated static files
		const outDir = path.join(process.cwd(), "/out");

		await new FtpDeploy().deploy({
			user: process.env.FTP_USER, // Your credentials
			password: process.env.FTP_PASS, // Your credentials
			host: process.env.FTP_HOST, // Your credentials
			port: process.env.FTP_PORT, // Your credentials

			localRoot: outDir, // Location of build files in project
			remoteRoot: "/", // Upload location on remote, replace with subfolder on FTP-server if required

			include: ["*", "**/*"], // Upload all files from build folder
			exclude: [], // Exclude no files

			deleteRemote: false, // Set to true if you want to delete ALL FILES in the remote root before uploading
			forcePasv: true // Use passive mode
		})

		console.log("Succesfully deployed site")
		return 0;
	} catch (e) {
		console.error("An error occured during deployment:", e);
		return 1;
  }
}

main().then((code) => process.exit(code));
```

## You’re done.

Now running `npm run deploy` will build your project to static files and automatically upload those static files.

## Potential issues

**The client wants to update the site by themselves**

The client may update some of the content used on the site, which is used at the build step. The site will then show old data and must be redeployed. One, quite manual way of getting over this issue is to enable the client to update the site by themselves using the same update script. It will take some time to properly set up, but may save a lot of time later.

1. Install `git`, `node` and `npm` on your clients computer.
2. Add them to the project’s GitHub repository as a collaborator (under settings, then collaborators).
3. Update the deploy script to include `git pull` and `npm i` at the start so it looks like `"deploy": "git pull && npm i && next build && next export && node ./scripts/deploy.js"`. This will ensure the client always has the latest version of the project and correct dependencies installed before deploying.
4. Clone the repository onto the client’s machine with `git clone https://github.com/username/reponame.git`.
5. Add the correct credentials to the `.env` file at the project.
6. Write any script file on the client’s computer to an accessible location, name it something clear, such as `Update Project.bat`. The script file must do two things: 1. navigate to the project root and 2. run `npm run deploy`.

After this setup your client may freely update any data related to the site, for example on a headless CMS and after updating they can then click `Update Project.bat` which will (from their point of view) run some magical code and the site is updated. Now all you need to do is ensure that the client doesn’t mess with any of the files in the project directory to make your life easier and only ever to interact with the project by running the update script.

**Alternatively**, you could provision a cloud computer to do the same thing when invoked via a webhook (that is triggered by any update to your client’s data sources) to automatically update the site without any client interaction. That however would cost you more than the previous $0 alternative.

**Old unused files are left on the FTP server**

If there are no other files on the FTP server at your `remoteRoot`, you can use the `deleteRemote: true` option to wipe all previous files when deploying new files. If you are unable to do that, you must either write custom logic to the script to delete previous files, manually delete unused files periodically or leave them be.