import { updateContent } from './Layout.js';

const ERROR_MESSAGES = {
    '404': 'Η σελίδα δεν βρέθηκε. Επιστροφή στην αρχική;',
    '500': 'Εσωτερικό σφάλμα διακομιστή. Δοκιμάστε ξανά αργότερα.',
    '505': 'Η έκδοση HTTP δεν υποστηρίζεται.',
};

export function renderError(code = 'Unknown') {
    const message = ERROR_MESSAGES[code] || 'Παρουσιάστηκε άγνωστο σφάλμα.';

    updateContent(`
        <div class="error-page">
            <div class="error-icon">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div class="error-code">Error ${code}</div>
            <div class="error-message">${message}</div>
            <a class="btn btn--primary" href="/">
                <i class="fa-solid fa-house"></i> Αρχική
            </a>
        </div>
    `);
}