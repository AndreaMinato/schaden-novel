import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const novelSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    // Transform string to Date object
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
})

const mga = defineCollection({
    loader: glob({ base: './src/content/novels/mga', pattern: '**/*.{md,mdx}' }),
    schema: novelSchema,
});

const chapters = defineCollection({
    loader: glob({ base: './src/content/novels', pattern: '**/*.{md,mdx}' }),
    schema: novelSchema,
});

export const collections = { mga, chapters };
