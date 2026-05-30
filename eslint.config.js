import js from '@eslint/js';

const browserGlobals = {
    window: 'readonly',
    document: 'readonly',
    navigator: 'readonly',
    history: 'readonly',
    location: 'readonly',
    fetch: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    performance: 'readonly',
    Notification: 'readonly',
    NodeFilter: 'readonly',
    DOMParser: 'readonly',
    FormData: 'readonly',
    MutationObserver: 'readonly',
    AbortController: 'readonly',
    localStorage: 'readonly',
    sessionStorage: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    console: 'readonly',
    requestAnimationFrame: 'readonly',
    cancelAnimationFrame: 'readonly',
    CustomEvent: 'readonly',
    Event: 'readonly',
    HTMLElement: 'readonly',
    Element: 'readonly',
    Node: 'readonly',
    crypto: 'readonly',
    btoa: 'readonly',
    atob: 'readonly',
    PushManager: 'readonly',
    Chart: 'readonly',
    EasyMDE: 'readonly',
};

const nodeGlobals = {
    process: 'readonly',
    Buffer: 'readonly',
    TextDecoder: 'readonly',
    TextEncoder: 'readonly',
    console: 'readonly',
    URL: 'readonly',
    fetch: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
};

export default [
    { ignores: ['dist/**', 'node_modules/**', 'public/sw.js'] },
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: browserGlobals,
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
            'eqeqeq': ['error', 'always', { null: 'ignore' }],
        },
    },
    {
        files: ['api/**/*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: nodeGlobals,
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
            'eqeqeq': ['error', 'always', { null: 'ignore' }],
        },
    },
    {
        files: ['**/*.test.js'],
        languageOptions: {
            globals: {
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                vi: 'readonly',
            },
        },
    },
];
