import { z } from "zod";
import { writeFile, rm } from "fs/promises";

/**
 * Base blog schema.
 */
export const blogSchema = z.object({
  id: z.number(),
  type_of: z.literal("article"),
  title: z.string(),
  description: z.string(),
  readable_publish_date: z.string(),
  slug: z.string(),
  path: z.string(),
  url: z.string(),
  comments_count: z.number(),
  public_reactions_count: z.number(),
  collection_id: z.number().nullable(),
  published_timestamp: z.string(),
  positive_reactions_count: z.number(),
  cover_image: z.string().url(),
  social_image: z.string().url(),
  canonical_url: z.string().url(),
  created_at: z.string(),
  edited_at: z.string().nullable(),
  crossposted_at: z.string().nullable(),
  published_at: z.string(),
  last_comment_at: z.string(),
  reading_time_minutes: z.number(),
  tag_list: z.string().array(),
  tags: z.string(),
});

export type Blog = z.TypeOf<typeof blogSchema>;

/**
 * Blog schema when fetching one.
 */
export const blogContentSchema = blogSchema.extend({
  tag_list: z
    .string()
    .transform((list) => list.split(",").map((item) => item.trim())),
  tags: z.string().array(),
  body_html: z.string(),
  body_markdown: z.string(),
});

export type BlogContent = z.TypeOf<typeof blogContentSchema>;

const baseUrl = "https://dev.to/api/articles";

/**
 * Get and validate all blogs.
 */
export async function getBlogs() {
  const response = await fetch(`${baseUrl}?username=jussinevavuori`);
  const result = await response.json();
  const parsed = blogSchema.array().safeParse(result);
  if (!parsed.success) {
    console.error(JSON.stringify(parsed.error, null, 2));
    return [];
  }
  return parsed.data;
}

/**
 * Get and validate blog by slug.
 */
export async function getBlogBySlug(slug: string) {
  const response = await fetch(`${baseUrl}/jussinevavuori/${slug}`);
  const result = await response.json();
  const parsed = blogContentSchema.safeParse(result);
  if (!parsed.success) {
    console.error(JSON.stringify(parsed.error, null, 2));
    return undefined;
  }
  return parsed.data;
}

export function blogContentToContentMarkdown(blog: BlogContent) {
  return `---
id: ${blog.id}
title: "${blog.title}"
description: "${blog.description}"
path: "${blog.path}"
url: "${blog.url}"
commentsCount: ${blog.comments_count}
publicReactionsCount: ${blog.public_reactions_count}
publishedTimestamp: ${blog.published_timestamp}
positiveReactionsCount: ${blog.positive_reactions_count}
coverImage: "${blog.cover_image}"
socialImage: "${blog.social_image}"
canonicalUrl: "${blog.canonical_url}"
createdAt: ${blog.created_at}
editedAt: ${blog.edited_at}
crosspostedAt: ${blog.crossposted_at}
publishedAt: ${blog.published_at}
lastCommentAt: ${blog.last_comment_at}
readingTimeMinutes: ${blog.reading_time_minutes}
tags: [${blog.tag_list.map((v) => `"${v.trim()}"`).join(", ")}]
---

${blog.body_markdown}`;
}

export async function exportBlogContentToContentMarkdown(blog: BlogContent) {
  const filename = `${process.cwd()}/src/content/blog/${blog.slug}.md`;
  try {
    await rm(filename);
  } catch {}
  try {
    await writeFile(filename, blogContentToContentMarkdown(blog));
  } catch {}
}

export async function exportAllBlogsToContentMarkdown() {
  const blogs = await getBlogs();
  return Promise.all(
    blogs.map(async (b) => {
      const blogContent = await getBlogBySlug(b.slug);
      if (!blogContent) return;
      return exportBlogContentToContentMarkdown(blogContent);
    })
  );
}
