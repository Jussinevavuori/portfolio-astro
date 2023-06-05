import { z, defineCollection } from "astro:content";

const recommendationsCollection = defineCollection({
  type: "content",
  schema: z.object({
    name: z.string(),
    title: z.string().optional(),
    url: z.string().url().optional(),
    image: z.string(),
  }),
});

const projectsCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    technologies: z.string().array(),
    projectUrl: z.string().optional(),
    githubUrl: z.string().optional(),
    startDate: z.date(),
    endDate: z.date().optional(),
    priority: z.number(),
    hasPage: z.boolean(),
    type: z.enum(["personal", "client", "school"]),
    teamSize: z.number().int().positive(),
  }),
});

export const blogCollection = defineCollection({
  // From dev.to
  type: "content",
  schema: z.object({
    id: z.number(),
    title: z.string(),
    description: z.string(),
    path: z.string(),
    url: z.string(),
    commentsCount: z.number(),
    publicReactionsCount: z.number(),
    publishedTimestamp: z.date(),
    positiveReactionsCount: z.number(),
    coverImage: z.string().url(),
    socialImage: z.string().url(),
    canonicalUrl: z.string().url(),
    createdAt: z.date(),
    editedAt: z.date().nullable(),
    crosspostedAt: z.date().nullable(),
    publishedAt: z.date(),
    lastCommentAt: z.date(),
    readingTimeMinutes: z.number(),
    tags: z.string().array(),
  }),
});

export const collections = {
  recommendations: recommendationsCollection,
  projects: projectsCollection,
  blog: blogCollection,
};
