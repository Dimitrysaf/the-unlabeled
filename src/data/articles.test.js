// Simulates a "posts" database table.
// Text articles: body lives in articleContent.test.js (future: DB text column).
// Interactive articles: codeModule is a string key referencing a code file
//   (future: DB stores the key, resolver loads the file dynamically).

export const sampleArticles = [
    {
        slug: 'electoral-calculator',
        title: 'Electoral Model 2027',
        subtitle: 'Greek opinion poll tracker and seat allocation model, sourced from Wikipedia.',
        excerpt: 'Interactive poll tracker and seat-allocation forecast for the 2027 Greek parliamentary election — with house-effects correction, momentum modelling and coalition analysis.',
        image: 'https://greekreporter.com/wp-content/uploads/2023/04/greek-diaspora-elections-public-domain-768x431.jpg',
        tags: [{ label: 'Politics' }, { label: 'Interactive' }],
        author: { name: 'The Unlabeled' },
        date: 'Apr 25, 2026',
        link: '/a/electoral-calculator',
        codeModule: 'electoral-calc',   // ← DB reference; resolved by [url].js at render time
    }
];