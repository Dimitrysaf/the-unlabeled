import { defineConfig } from 'vite';

export default defineConfig({
    test: {
        include: ['src/**/*.test.js'],
        exclude: ['src/data/~*.js'],
        coverage: {
            provider: 'v8',
            include: ['src/lib/**'],
        },
    },
});
