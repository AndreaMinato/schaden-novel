#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const cacheFile = join(rootDir, 'build-cache', 'incremental-state.json');

// Ensure cache directory exists
try {
    execSync('mkdir -p build-cache', { cwd: rootDir });
} catch (e) {
    // Directory might already exist
}

// Function to get git hash of the last commit
function getGitHash() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        return 'unknown';
    }
}

// Function to get list of changed files since last build
function getChangedFiles(lastHash) {
    if (!lastHash || lastHash === 'unknown') {
        return { all: true, files: [] };
    }

    try {
        const changedFiles = execSync(`git diff --name-only ${lastHash} HEAD`, { encoding: 'utf8' })
            .trim()
            .split('\n')
            .filter(file => file.length > 0);

        return { all: false, files: changedFiles };
    } catch (e) {
        console.log('Could not determine changed files, doing full build');
        return { all: true, files: [] };
    }
}

// Check if content files have changed
function hasContentChanged(changedFiles) {
    return changedFiles.some(file =>
        file.startsWith('src/content/') ||
        file.startsWith('src/pages/') ||
        file.startsWith('src/components/') ||
        file.startsWith('src/layouts/') ||
        file.includes('astro.config') ||
        file.includes('content.config')
    );
}

// Main build function
async function buildIncremental() {
    console.log('🚀 Starting incremental build...');

    // Read previous build state
    let previousState = {};
    if (existsSync(cacheFile)) {
        try {
            previousState = JSON.parse(readFileSync(cacheFile, 'utf8'));
        } catch (e) {
            console.log('Could not read previous build state, doing full build');
            previousState = {};
        }
    }

    const currentHash = getGitHash();
    const changed = getChangedFiles(previousState.lastHash);

    console.log(`Current commit: ${currentHash}`);
    console.log(`Previous commit: ${previousState.lastHash || 'none'}`);

    let shouldBuild = true;
    let buildType = 'full';

    if (!changed.all && changed.files.length > 0) {
        console.log('Changed files:', changed.files);

        if (hasContentChanged(changed.files)) {
            console.log('📖 Content changes detected, building affected pages...');
            buildType = 'content';
        } else {
            console.log('📄 Non-content changes detected, doing full build...');
            buildType = 'full';
        }
    } else if (!changed.all && changed.files.length === 0) {
        console.log('✅ No changes detected, skipping build');
        shouldBuild = false;
    } else {
        console.log('🔄 Full build required');
        buildType = 'full';
    }

    if (shouldBuild) {
        console.log(`Building (${buildType})...`);

        // Set environment variables for the build
        const env = {
            ...process.env,
            ASTRO_BUILD_CACHE: 'true',
            ASTRO_BUILD_TYPE: buildType,
        };

        try {
            // Run the build with appropriate caching
            execSync('pnpm run build', {
                cwd: rootDir,
                stdio: 'inherit',
                env
            });

            console.log('✅ Build completed successfully!');

            // Update build state
            const newState = {
                lastHash: currentHash,
                lastBuild: new Date().toISOString(),
                buildType,
                success: true
            };

            writeFileSync(cacheFile, JSON.stringify(newState, null, 2));

        } catch (error) {
            console.error('❌ Build failed:', error.message);

            // Still update state to prevent infinite rebuilds
            const newState = {
                lastHash: previousState.lastHash, // Keep previous hash on failure
                lastBuild: new Date().toISOString(),
                buildType,
                success: false,
                error: error.message
            };

            writeFileSync(cacheFile, JSON.stringify(newState, null, 2));
            process.exit(1);
        }
    } else {
        console.log('⏭️  Skipping build - no changes detected');
    }
}

// Run the build
buildIncremental().catch(error => {
    console.error('❌ Incremental build failed:', error);
    process.exit(1);
});
