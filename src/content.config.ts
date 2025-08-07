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

// Optimize loaders with caching and incremental loading
const chapters = defineCollection({
    loader: glob({
        base: './src/content/novels',
        pattern: '**/*.{md,mdx}',
        // Enable incremental loading - only process changed files
        generateId: ({ entry, base }) => {
            // Use relative path as ID for better caching
            const relativePath = entry.replace(base + '/', '');
            return relativePath.replace(/\.(md|mdx)$/, '');
        },
    }),
    schema: novelSchema,
});

// Individual novel collections for better caching granularity
const mga = defineCollection({
    loader: glob({
        base: './src/content/novels/mga',
        pattern: '**/*.{md,mdx}',
        generateId: ({ entry, base }) => {
            const relativePath = entry.replace(base + '/', '');
            return `mga/${relativePath.replace(/\.(md|mdx)$/, '')}`;
        },
    }),
    schema: novelSchema,
});

const atg = defineCollection({
    loader: glob({
        base: './src/content/novels/atg',
        pattern: '**/*.{md,mdx}',
        generateId: ({ entry, base }) => {
            const relativePath = entry.replace(base + '/', '');
            return `atg/${relativePath.replace(/\.(md|mdx)$/, '')}`;
        },
    }),
    schema: novelSchema,
});

const overgeared = defineCollection({
    loader: glob({
        base: './src/content/novels/overgeared',
        pattern: '**/*.{md,mdx}',
        generateId: ({ entry, base }) => {
            const relativePath = entry.replace(base + '/', '');
            return `overgeared/${relativePath.replace(/\.(md|mdx)$/, '')}`;
        },
    }),
    schema: novelSchema,
});

const tmw = defineCollection({
    loader: glob({
        base: './src/content/novels/tmw',
        pattern: '**/*.{md,mdx}',
        generateId: ({ entry, base }) => {
            const relativePath = entry.replace(base + '/', '');
            return `tmw/${relativePath.replace(/\.(md|mdx)$/, '')}`;
        },
    }),
    schema: novelSchema,
});

const htk = defineCollection({
    loader: glob({
        base: './src/content/novels/htk',
        pattern: '**/*.{md,mdx}',
        generateId: ({ entry, base }) => {
            const relativePath = entry.replace(base + '/', '');
            return `htk/${relativePath.replace(/\.(md|mdx)$/, '')}`;
        },
    }),
    schema: novelSchema,
});

const issth = defineCollection({
    loader: glob({
        base: './src/content/novels/issth',
        pattern: '**/*.{md,mdx}',
        generateId: ({ entry, base }) => {
            const relativePath = entry.replace(base + '/', '');
            return `issth/${relativePath.replace(/\.(md|mdx)$/, '')}`;
        },
    }),
    schema: novelSchema,
});

const cd = defineCollection({
    loader: glob({
        base: './src/content/novels/cd',
        pattern: '**/*.{md,mdx}',
        generateId: ({ entry, base }) => {
            const relativePath = entry.replace(base + '/', '');
            return `cd/${relativePath.replace(/\.(md|mdx)$/, '')}`;
        },
    }),
    schema: novelSchema,
});

const lrg = defineCollection({
    loader: glob({
        base: './src/content/novels/lrg',
        pattern: '**/*.{md,mdx}',
        generateId: ({ entry, base }) => {
            const relativePath = entry.replace(base + '/', '');
            return `lrg/${relativePath.replace(/\.(md|mdx)$/, '')}`;
        },
    }),
    schema: novelSchema,
});

const mw = defineCollection({
    loader: glob({
        base: './src/content/novels/mw',
        pattern: '**/*.{md,mdx}',
        generateId: ({ entry, base }) => {
            const relativePath = entry.replace(base + '/', '');
            return `mw/${relativePath.replace(/\.(md|mdx)$/, '')}`;
        },
    }),
    schema: novelSchema,
});

const rtw = defineCollection({
    loader: glob({
        base: './src/content/novels/rtw',
        pattern: '**/*.{md,mdx}',
        generateId: ({ entry, base }) => {
            const relativePath = entry.replace(base + '/', '');
            return `rtw/${relativePath.replace(/\.(md|mdx)$/, '')}`;
        },
    }),
    schema: novelSchema,
});

export const collections = {
    chapters,
    mga,
    atg,
    overgeared,
    tmw,
    htk,
    issth,
    cd,
    lrg,
    mw,
    rtw
};
