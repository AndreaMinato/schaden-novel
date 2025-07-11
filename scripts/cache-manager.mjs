#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const cacheDir = join(rootDir, 'build-cache');
const cacheFile = join(cacheDir, 'incremental-state.json');

// Command line argument handling
const command = process.argv[2];

function showHelp() {
    console.log(`
🚀 Build Cache Manager

Usage: node scripts/cache-manager.mjs <command>

Commands:
  status    Show current cache status
  clear     Clear build cache
  info      Show detailed cache information
  help      Show this help message

Examples:
  node scripts/cache-manager.mjs status
  node scripts/cache-manager.mjs clear
`);
}

function getGitHash() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
        return 'unknown';
    }
}

function getCacheStatus() {
    if (!existsSync(cacheFile)) {
        return { exists: false, data: null };
    }

    try {
        const data = JSON.parse(readFileSync(cacheFile, 'utf8'));
        return { exists: true, data };
    } catch (e) {
        return { exists: false, data: null, error: e.message };
    }
}

function clearCache() {
    try {
        if (existsSync(cacheDir)) {
            rmSync(cacheDir, { recursive: true, force: true });
            console.log('✅ Build cache cleared successfully');
        } else {
            console.log('ℹ️  No build cache to clear');
        }
    } catch (e) {
        console.error('❌ Failed to clear cache:', e.message);
        process.exit(1);
    }
}

function showStatus() {
    const currentHash = getGitHash();
    const cacheStatus = getCacheStatus();

    console.log('\n📊 Build Cache Status\n');
    console.log(`Current commit: ${currentHash}`);

    if (!cacheStatus.exists) {
        console.log('Cache status: ❌ No cache found');
        if (cacheStatus.error) {
            console.log(`Cache error: ${cacheStatus.error}`);
        }
        return;
    }

    const data = cacheStatus.data;
    console.log(`Cache status: ✅ Cache exists`);
    console.log(`Last build commit: ${data.lastHash || 'unknown'}`);
    console.log(`Last build time: ${data.lastBuild ? new Date(data.lastBuild).toLocaleString() : 'unknown'}`);
    console.log(`Last build type: ${data.buildType || 'unknown'}`);
    console.log(`Last build success: ${data.success ? '✅' : '❌'}`);

    if (data.error) {
        console.log(`Last error: ${data.error}`);
    }

    // Check if rebuild is needed
    if (data.lastHash === currentHash) {
        console.log('\n🎯 Status: No rebuild needed (no changes detected)');
    } else {
        console.log('\n🔄 Status: Rebuild recommended (changes detected)');
    }
}

function showInfo() {
    console.log('\n📋 Build Cache Information\n');
    console.log('Cache directory:', cacheDir);
    console.log('State file:', cacheFile);
    console.log('Cache exists:', existsSync(cacheDir) ? '✅' : '❌');
    console.log('State file exists:', existsSync(cacheFile) ? '✅' : '❌');

    if (existsSync(cacheDir)) {
        try {
            const stats = execSync(`du -sh "${cacheDir}"`, { encoding: 'utf8' }).trim();
            console.log('Cache size:', stats.split('\t')[0]);
        } catch (e) {
            console.log('Cache size: Unable to determine');
        }
    }
}

// Main command handler
switch (command) {
    case 'status':
        showStatus();
        break;
    case 'clear':
        clearCache();
        break;
    case 'info':
        showInfo();
        break;
    case 'help':
    case '--help':
    case '-h':
        showHelp();
        break;
    default:
        console.log(`❌ Unknown command: ${command || 'none'}`);
        showHelp();
        process.exit(1);
}
