import { enhancedImages } from '@sveltejs/enhanced-img';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        enhancedImages(),
        sveltekit({
            adapter: adapter({
                pages: 'build',
                assets: 'build',
                fallback: 'index.html',
                precompress: false,
                strict: true
            })
        })
    ]
});
