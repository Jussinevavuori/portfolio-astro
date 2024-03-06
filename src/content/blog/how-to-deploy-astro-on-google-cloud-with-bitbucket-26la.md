---
id: 1603636
title: "How to Deploy Astro on Google Cloud with Bitbucket."
description: "Lighthouse score for improved SEO**   Note: This guide does not only apply to Astro but can be..."
path: "/jussinevavuori/how-to-deploy-astro-on-google-cloud-with-bitbucket-26la"
url: "https://dev.to/jussinevavuori/how-to-deploy-astro-on-google-cloud-with-bitbucket-26la"
commentsCount: 0
publicReactionsCount: 1
publishedTimestamp: 2023-09-18T09:41:37Z
positiveReactionsCount: 1
coverImage: "https://res.cloudinary.com/practicaldev/image/fetch/s--chhUrK2U--/c_imagga_scale,f_auto,fl_progressive,h_420,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/490hudrape48sjk6nljg.png"
socialImage: "https://res.cloudinary.com/practicaldev/image/fetch/s--HSf4PRcI--/c_imagga_scale,f_auto,fl_progressive,h_500,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/490hudrape48sjk6nljg.png"
canonicalUrl: "https://dev.to/jussinevavuori/how-to-deploy-astro-on-google-cloud-with-bitbucket-26la"
createdAt: 2023-09-18T09:41:38Z
editedAt: 2023-09-22T07:23:27Z
crosspostedAt: null
publishedAt: 2023-09-18T09:41:37Z
lastCommentAt: 2023-09-18T09:41:37Z
readingTimeMinutes: 12
tags: ["astro", "googlecloud", "cicd", "webdev"]
---

 Lighthouse score for improved SEO**

> **Note**: This guide **does not only apply to Astro** but can be applied and adapted to suit any static site deployment needs for any SSG codebase.

## Project repository

[Project repository available here](https://bitbucket.org/vertics/gcp-astro-template/).

---

## Requirements

The setup requires

- **Google Cloud**
  - Google Cloud Project _(New or existing)_.
  - Billing Account connected to the Project.
  - Permissions to enable APIs, create load balancers, storage buckets etc.
- **Domain**
  - Access to DNS settings.
- **Bitbucket**
  - Access to repository settings.

### This guide assumes

- This guide assumes that you are using the `main` branch. In order to use the `master` branch, you might have to change `main` to `master` in many scripts.

### This guide does not include

- **Partial redeployments**: Using this guide, you rebuild and redeploy your entire site on all changes. Setup for a system which only redeploys changed pages is beyond the scope of this guide and often not required.
- **Staging or other preview deployments**: Using this guide, you only get a `main` branch that automatically deploys to your live site. Staging and other preview deployments are beyond the scope of this guide.

### This guide does not support

- **Server-side rendering or other server methods**: This guide only applies to static sites and static site generation. In order to use server-side rendering or other server-side methods, you must deploy to a server using other available guides.

---

## Step-by-step setup guide

### 1. Setup Google Cloud Project.

[Create a new GCP project](https://console.cloud.google.com/projectcreate) or use your existing GCP project.

Ensure that the project has an attached **billing account**.

### 2. Creating your Storage Bucket

Create a new bucket under [Cloud Storage](https://cloud.google.com/storage) and name the bucket, for example `astro`. Use the following recommended options.

<!-- prettier-ignore -->
| Setting | Recommended value |
|---|---|
| Name | Any name, e.g. `astro` |
| Location | **Multi-region** or other preffered |
| Storage class | **Standard** |
| Public access | **Do *NOT* enforce public access prevention on bucket** |
| Access control | **Uniform** |
| Protection tools | **None** |

#### 2.1. Configuring your Storage Bucket to be public to everyone

Enable public access by **adding a new permission to `allUsers` called `Storage Object Viewer`**.

This can be done in your bucket under _Permissions_ and _Grant access_ by selecting `allUsers` as the principal and assigning the `Storage Object Viewer` role to that principal. No IAM condition is required. Then save and _allow public access_.

#### 2.2. Customize Storage Bucket website configuration

Navigate to all buckets and under the overflow settings ("..." icon), select **edit website configuration**. Set the following options.

<!-- prettier-ignore -->
| Setting | Recommended value |
|---|---|
| Entrypoint | `index.html` |
| Error page | `404.html` |

### 3. Initial file upload

Build your project locally using `npm run build`, then **upload the contents of your `/dist` folder** (not the folder itself) to your storage bucket.

This is done so that you can test your site and that the automated pipelines `gsutil rm` step won't error when it tries to delete from an empty bucket. The upload will later be automated using the pipeline.

### 4. Enabling required APIs

Navigate to `APIs and Services` and enable the following APIs:

- `Compute Engine API`
- `Certificate Manager API`

### 5. Set up a Load balancer

[Navigate to Load Balancing under Networking](https://console.cloud.google.com/networking/loadbalancing/add) and **create a new load balancer**.

1. Select **Application Load Balancer** and **Start Configuration**.
1. Leave default options (_From Internet to my VMs or serverless services_ and _Global external Application Load Balancer_) and create the load balancer.
1. Name your load balancer, e.g. `astro-lb`.

#### 5.1. Configure the Load Balancer Frontend

Configure the load balancer frontend with the following options, including a static IP and a SSL certificate.

<!-- prettier-ignore -->
| Setting | Recommended value |
|---|---|
| Name | Any name, e.g. `astro-lb-frontend` |
| Protocol | **HTTPS (includes HTTP/2)** |
| IP address | 1. Create new IP address.<br/>2. Name the IP address, for example `astro-lb-frontend-ip`.<br/>3. Reserve the IP address. |
| Certificate | 1. Create new certificate<br/>2. Name the certificate, for example `astro-lb-certificate`.<br/>3. Select *Create Google-managed certificate*.<br/>4. Add your domain, for example `www.example.com`.<br/>5. Create the certificate. |
| Port | `443` |
| IP version | `IPv4` |
| HTTP to HTTPS redirect | **Enabled** |

#### 5.2. Configure the Load Balancer Backend

Configure the load balancer backend. Start by under **Backend services & backend buckets** selecting **Create a backend bucket**. Then create the bucket with the following recommnended options.

<!-- prettier-ignore -->
| Setting | Recommended value |
|---|---|
| Name | Any name, e.g. `astro-lb-backend-bucket` (Does not have to match the bucket name from before). |
| Cloud storage buckets | Browse and **select your bucket** from before. |
| Cloud CDN | **Enabled** |
| Cache options | Recommended to leave default options (Cache static content only). |

#### 5.3. Finalizing the Load Balancer

You can skip configuring routing rules and optionally go to review and finalize. Once done, **click create**.

#### 5.4. Enabling compression

By default, your files are sent uncompressed. In order to further optimize and speed up your site, we enable compression. First, navigate to **Cloud CDN** under **Network services**. Select your backend bucket and **edit**.

Under **cache performance**, select **Compression mode**: **Cutomatic** and save.

### 6. Connect your domain to the Load Balancer

Open your created load balancer to **find the load balancer's IP address**. Then **go to your domain's DNS settings**. Create **required A records** to point to your load balancer's IP address. For example (given the example load balancer IP address `30.90.80.100`).

<!-- prettier-ignore -->
| NAME  | TYPE | VALUE          |
|-------|------|----------------|
| `www` | `A`  | `30.90.80.100` |
| `@`   | `A`  | `30.90.80.100` |

### 7. Wait, up to 24 hours

Next you have to wait up to 24 hours for **the SSL certificate to be signed** and for **DNS settings to propagate**.

To inspect these settings, you can try:

1. `dig` to inspect your DNS settings and to ensure the `A` records have succesfully been set.
1. **Navigating to your domain**. If this works, the configuration should be ok. However, **ensure HTTPS redirection works**.
1. **Navigating to your load balancer IP address**. If this works, the configuration should be ok. However, **ensure HTTPS redirection works**.
1. `curl -v` to inspect that your load balancer works. It should provide you with redirects which you can follow using more `curl -v` invocations until you reach a `text/html` response.
1. In Google Cloud Console, navigate to **Certificate Manager** under **Security**. Select the **Classic certificates** tab and open your certificate to view its status.

### 8. Set up Bitbucket repository

Follow the [Bitbucket instructions](https://support.atlassian.com/bitbucket-cloud/docs/create-a-git-repository/) and create a new Bitbucket repository. Push your code onto a `main` branch with `git` [(how to push code to remote repo with `git`)](https://letmegooglethat.com/?q=how+to+git+gud).

#### 8.1. Enable Bitbucket pipelines in your repository

To enable bitbucket pipelines in your repository, navigate to **Repository settings** and then **Settings** under **Pipelines**. Here you can enable pipelines. We will configure the `bitbucket-pipelines.yml` file later.

### 9. Set up Google Cloud for Bitbucket pipelines

The Bitbucket pipelines script will need access to Google Cloud. We do this by creating a service account for the pipeline as follows.

#### 9.1. Creating a service account for Bitbucket pipelines

Navigate to **IAM & Admin** in Google Cloud Console, then to **Service Accounts**, then **Create a service account** using the following options.

<!-- prettier-ignore -->
| Setting | Recommended value |
|---|---|
| Name | Any name, e.g. `Bitbucket Pipelines Service Account` |
| ID | Any ID, e.g. `bitbucket-pipelines` |
| Description | *Optional* |

Then **grant the service account** the following roles:

- `Storage Admin` to access and manage the files in Google Cloud Storage.
- `Compute Load Balancer Admin` to access and manage the load balancer, e.g. invalidating the cache.

No users need access to the service account.

#### 9.2. Creating a key for the service account

Select the created service account, then navigate to the **Keys** tab. Select **Add key** and **Create a new key**. Create a **JSON** key. This will download a new `.json` file, which is the service account key.

> **NOTE: Keep this key safe and private, do NOT upload it to any repository**.

#### 9.3. Base64 encoding the key

Bitbucket requires the key as a base64 encoded string. To encode the JSON file in base64, we use `openssl` _(if not available on your platform, search online how to base64 encode files on your operating system_). Run the following command in your terminal:

```sh
$ openssl base64 -A -in {path/to/key.json} -out {base64-key-file}
```

Now, the base64 encoded key is saved in the file defined as the `base64-key-file`.

#### 9.4. Uploading the key and other repository variables to Bitbucket

_Ensure you have enabled bitbucket pipelines in step 8.1._ Open your Bitbucket repository, navigate to **Repository settings** and **Repository variables** under **Pipelines**. Add the Google Cloud Service Account key as a repository variable with the following settings. Also, add the other following variables

<!-- prettier-ignore -->
| Name                  | Value                         | Secured          |
|-----------------------|-------------------------------|------------------|
| `GCLOUD_KEY`          | The base64 encoded string †   | ✅ *Recommended* |
| `GCLOUD_PROJECT`      | Your Google Cloud Project ID  | *Not required*   |
| `GCLOUD_BUCKET`       | Your Google Cloud Bucket name | *Not required*   |
| `GCLOUD_SOURCE`       | `dist/**` or other ††         | *Not required*   |
| `GCLOUD_LOAD_BALANCER`| Your load balancer's name     | *Not required*   |

† Can be found in the output file from step 9.3. Useful tip for copying a file to clipboard is to use

```sh
$ pbcopy < path/to/file
```

†† You can also use your custom build output folder. `**` ensures the directory is not copied but its contents. See [`gsutil cp` reference](https://cloud.google.com/storage/docs/gsutil/commands/cp) for more information.

Now your pipeline can access your google cloud account by using `$GCLOUD_KEY`, and other details about your Google Cloud deployment setup with the associated variables. [_Learn more about repository variables_](https://support.atlassian.com/bitbucket-cloud/docs/variables-and-secrets/)

### 10. Set up Bitbucket pipelines

Next we create a pipeline to automatically build and re-deploy the site to Google Cloud Storage on any changes to the `main` branch.

#### 10.1. Creating the `.env.example` file

> If you have a static site with no build step, you can skip this step.

Start by creating a **.env.example** file, which contains all your environment variables with placeholder values and optionally descriptions on their usage. This is used to detech which environment variables should be fetched from the deployment environment into the pipeline for building.

```sh
# Description about the usage of FOO
FOO="your-foo-value"

# Description about the usage of BAR
BAR="your-bar-value"
```

> **The file must end in a newline**

#### 10.2. Uploading environment variables into Bitbucket

> If you have a static site with no build step, you can skip this step.

Upload all your environment variables into Bitbucket by navigating to **Repository settings**, then **Deployments** under **Pipelines**. If there doesn't already exist a `Production` deployment, create a new deployment named `Production`.

Open the `Production` deployment and add any environment variables required for your production build there. Secure them optionally. If you do not have any custom environment variables, leave the file empty.

#### 10.3. Utility script for pulling environment variables into build

> If you have a static site with no build step, you can skip this step.

Create a new folder in your project called `pipeline-scripts`. In there, create a new script file called `create-dot-env.sh` and copy the following script into that file.

```sh
#!/bin/sh

# Define input file to parse environment variable names from and output files
# where final values will be written.
INPUT_FILE=".env.example"
OUTPUT_FILE=".env"

# Use a while loop to read each line of the example file
while read line; do

  # Extract the variable name from the line
  VAR_NAME=$(echo "$line" | grep -o "^[A-Za-z_][A-Za-z0-9_]*")

  # Check if the variable name is not empty
  if [ -n "$VAR_NAME" ]; then

    # Get the value of the variable from the environment
    VAR_VALUE=$(echo "${!VAR_NAME}")

    # Write the variable and its value to the output file
    echo "${VAR_NAME}=${VAR_VALUE}" >> "$OUTPUT_FILE"

  fi

done < "$INPUT_FILE"
```

This script will find all environment variables defined in `.env.example`, copy their respective values from the deployment and populate a new `.env` file with those values to be used in the build.

#### 10.4. Creating the pipeline

> If you have a static site with no build step, modify the pipeline script by removing the installations and commands as instructed in the comments.

Copy the following `bitbucket-pipelines.yml` code to a file called `bitbucket-pipelines.yml` in your project. The file can also be found in this project's repository. It uses the repository variables from steps 9 and 10.

You can copy and paste this file as is, without customization.

```yml
image: "node:18"

# Run pipelines when code is merged (or pushed) onto the `main` branch or when
# the `branches: main` is otherwise triggered.
pipelines:
  branches:
    main:
      # This line might incorrectly show an error if you have automatic pipeline linting enabled in your editor.
      - stage:
          # Use environment variables from the "Production" deployment.
          deployment: Production
          name: Deploy to production
          steps:
            - step:
                # Use Google Cloud SDK image to access `gsutil` and `gcloud`.
                image: google/cloud-sdk:alpine
                name: Build and deploy app to Google Cloud Storage
                script:
                  # -------------------------------------------
                  # NOTE FOR STATIC WEBSITES WITHOUT BUILD STEP
                  # -------------------------------------------
                  # In order to deploy sites that do not have a build step,
                  # ensure your $GCLOUD_SOURCE is correctly set. In addition,
                  # you can remove `nodejs` and `npm` from the `apk add`
                  # command. Additionally, you can remove the
                  # `bash ./pipeline-scripts/create-dot-env.sh`,
                  # `npm install` and `npm run build` steps.

                  # Install `node` and `npm` (google/cloud-sdk does not come
                  # with node) and coreutils to support e.g. base64 --decode
                  # flag, which is by default not supported on alpine.
                  - apk add --update nodejs npm coreutils

                  # Export all environment variables and build a `.env` file
                  # for the build step. Requires a `.env.example` file.
                  - bash ./pipeline-scripts/create-dot-env.sh

                  # Decode base64 encoded service account key into key-file.json
                  # for use in gcloud tool
                  - echo $GCLOUD_KEY > base64-key-file
                  - base64 --decode base64-key-file > key-file.json

                  # Activate service account in gcloud and select currently active project
                  - gcloud auth activate-service-account --key-file key-file.json
                  - gcloud config set project $GCLOUD_PROJECT

                  # Install dependencies and build project
                  - npm install
                  - npm run build

                  # Delete all previous files and upload new built files to Google Cloud Storage
                  # https://cloud.google.com/storage/docs/gsutil/commands/rm
                  # NOTE: If the "gsutil rm" fails, upload any files to your gcloud bucket for it to delete.
                  - gsutil -m rm -a gs://$GCLOUD_BUCKET/**
                  - gsutil cp -r $GCLOUD_SOURCE gs://$GCLOUD_BUCKET/

                  # Invalidate cloud CDN cache (All paths with "/*")
                  - gcloud compute url-maps invalidate-cdn-cache $GCLOUD_LOAD_BALANCER --path "/*" --async
```

#### 10.5. Applying the pipeline

Push your changes to Bitbucket and merge them to `main`. This will automatically register the pipeline. Navigate to **pipelines** and you should see your pipeline running. Ensure the pipeline runs correctly.

### 11. Deployment options

Your site is now live and can be deployed using bitbucket pipelines. However, in the next steps we are going to create more deployment options to ease deployment. All deployment options work by triggering the

The four deployment options we are going to have are

<!-- prettier-ignore -->
| # | Name                          | Type      | Usage |
|---|-------------------------------|-----------|-------|
| 1 | Automatically on code changes | Automatic | Redeploy on code changes. |
| 2 | Manually                      | Manual    | Redeploy manually when content changes from Bitbucket console. |
| 3 | On a schedule                 | Automatic | Redeploy periodically on a schedule when content changes constantly. |
| 4 | Programmatically              | Automatic | Automate deployments via any other needs programmatically, e.g. via a webhook on your CMS that listens to changes. |

#### 11.1. Deploy automatically on code changes

**Already done and available**. The bitbucket pipeline has already been setup during this guide and any code changes to the `main` branch will trigger a redeployment.

#### 11.2. Deploy manually

**Already done and available**. The bitbucket pipeline has already been setup during this guide and can be deployed manually:

1. Navigate to your Bitbucket repository and select **Pipelines**.
1. Select **Run pipeline** in the top-right corner with the following options:
   - **Branch**: `main`
   - **Pipeline**: `branches: main`
1. **Run** the pipeline.

#### 11.3. Deploy on a schedule

We use the _Scheduled pipelines_ feature available in Bitbucket to automatically redeploy your site either hourly, daily or weekly.

1. Navigate to your Bitbucket repository and select **Pipelines**.
1. Select **Schedules** and create a **New schedule** with the following options:
   - **Branch**: `main`
   - **Pipeline**: `branches: main`
   - **Schedule**: Configure as best suits your use case.
1. **Create** the schedule.
1. You can later manage the schedule by toggling it, editing it, removing it or adding new schedules.

> If you need more complex schedules not supported by Bitbucket scheduled pipelines, look into 11.4. for programmatic deployment options that can be integrated with Google Cloud Scheduler to enable deployment on any Cron schedule.

#### 11.4. Deploy programmatically

Next we are going to setup programmatic deployments. These can be used to create multiple customized deployment methods, such as

- **Webhooks**, e.g. on every change in your CMS.
- **Cron jobs**, e.g. with Google Cloud Scheduler when Bitbucket pipeline schedules are not enough.
- **A custom deploy button** in a protected interface that can make a post request.
- **A custom `deploy.sh` deployment script** to deploy from your terminal (included in repo).

##### 11.4.1. Create repository access token

In your Bitbucket repository settings, go to **Access tokens** and **Create Repository Access Token**. Use the following settings:

<!-- prettier-ignore -->
| Setting | Recommended value |
|---|---|
| Name | Any value, e.g. `pipeline-deployer`. |
| Scopes | At the least `Pipelines / Read` and `Pipelines / Write`. |

Create the access token and copy the token (from now on referred to as `$BITBUCKET_REPOSITORY_ACCESS_TOKEN`) to a safe place, such as your `.env` file.

##### 11.4.2. Formulating the API call

You can automatically trigger Bitbucket pipelines using the following `curl` command or any equivalent method, e.g. `fetch()` in Node.

Easiest way to access the `$BITBUCKET_USERNAME` and `$BITBUCKET_REPOSITORY_SLUG` variable values are in your Bitbucket repository URL (`https://bitbucket.org/$BITBUCKET_USERNAME/$BITBUCKET_REPOSITORY_SLUG/`).

**Shell**

```sh
curl -X POST -is \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer $BITBUCKET_REPOSITORY_ACCESS_TOKEN" \
 https://api.bitbucket.org/2.0/repositories/$BITBUCKET_USERNAME/$BITBUCKET_REPOSITORY_SLUG/pipelines/ \
	-d '
	{
		"target": {
			"ref_type": "branch",
			"type": "pipeline_ref_target",
			"ref_name": "main"
		}
	}'
```

**JavaScript**

```js
const BITBUCKET_USERNAME = "..."
const BITBUCKET_REPOSITORY_SLUG = "..."
const BITBUCKET_REPOSITORY_ACCESS_TOKEN = "..." // From process.env preferrably

await fetch(
	`https://api.bitbucket.org/2.0/repositories/${BITBUCKET_USERNAME}/${BITBUCKET_REPOSITORY_SLUG}/pipelines/`
	{
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${BITBUCKET_REPOSITORY_ACCESS_TOKEN}`,
		},
		body: JSON.stringify({
			target: {
				ref_type: "branch",
				type: "pipeline_ref_target",
				ref_name: "main",
			}
		})
	}
);
```

---

## References and troubleshooting

Below is a list of some of the references used for creating this documentation. Use these for further reference if you encounter more problems or want to further develop the deployment.

- [Astro's Google Cloud Deployment Guide](https://docs.astro.build/en/guides/deploy/google-cloud/)
- [Google Cloud's "Host a static website" Guide](https://cloud.google.com/storage/docs/hosting-static-website)
- [`gsutil rm` reference](https://cloud.google.com/storage/docs/gsutil/commands/rm)
- [`gsutil cp` reference](https://cloud.google.com/storage/docs/gsutil/commands/cp)
- [`gcloud compute url-maps invalidate-cdn-cache` reference](https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/invalidate-cdn-cache)
- [Atlassian's guide on triggering pipelines](https://support.atlassian.com/bitbucket-cloud/docs/pipeline-triggers/)
- [The Bitbucket Cloud REST API](https://developer.atlassian.com/cloud/bitbucket/rest/intro/#basic-auth)
