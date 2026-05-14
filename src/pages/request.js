// src/pages/request.js
import { updateContent } from '../components/Layout.js';
import { clearFieldErrors, setFieldError, setButtonLoading, resetButton, showErrorSummary } from '../lib/validation.js';
import { createSubmission } from '../data/submissions.js';

const CATEGORIES = {
    greece_scandals: {
        label: "Greece's Scandals",
        caption: "Greece's Scandals",
        heading: 'Submit a report',
        intro: 'Help us document corruption and misconduct in Greece. If you have evidence, sources, or knowledge of a scandal, submit it below. All submissions are reviewed before any information is published.',
        titleHint: 'A short headline describing the scandal',
        descriptionHint: 'Describe the scandal, who is involved, and what evidence exists',
        sourceHint: 'A link to a news article, document, or other evidence',
        submitLabel: 'Submit report',
        successHeading: 'Your report has been submitted.',
        successBody: 'Thank you. We will review it and get in touch if we need more details.',
    },
    general: {
        label: 'General Request',
        caption: 'General Request',
        heading: 'Submit a request',
        intro: 'Have a tip, a lead, or something you\'d like us to look into? Fill in the form below. All submissions are reviewed by our team.',
        titleHint: 'A short title for your request or tip',
        descriptionHint: 'Describe your request or the information you want to share',
        sourceHint: 'A link to a relevant article, document, or resource',
        submitLabel: 'Submit request',
        successHeading: 'Your request has been submitted.',
        successBody: 'Thank you. We will review it and get in touch if we need more details.',
    },
};

export function renderRequest() {
    renderCategorySelection();
}

function renderCategorySelection() {
    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">
                    <h1 class="govuk-heading-xl">Submit a request</h1>
                    <p class="govuk-body">What would you like to submit?</p>

                    <form id="category-form" novalidate>
                        <div class="govuk-form-group" id="category-group">
                            <fieldset class="govuk-fieldset">
                                <legend class="govuk-fieldset__legend govuk-fieldset__legend--m">
                                    <h2 class="govuk-fieldset__heading">Select a category</h2>
                                </legend>
                                <p id="category-error" class="govuk-error-message" hidden>
                                    <span class="govuk-visually-hidden">Error:</span> Select a category to continue
                                </p>
                                <div class="govuk-radios" data-module="govuk-radios">
                                    <div class="govuk-radios__item">
                                        <input class="govuk-radios__input" id="cat-greece" name="category" type="radio" value="greece_scandals">
                                        <label class="govuk-label govuk-radios__label govuk-label--s" for="cat-greece">
                                            Greece's Scandals
                                        </label>
                                        <div class="govuk-hint govuk-radios__hint">
                                            Report corruption, misconduct, or a scandal involving Greece
                                        </div>
                                    </div>
                                    <div class="govuk-radios__divider">or</div>
                                    <div class="govuk-radios__item">
                                        <input class="govuk-radios__input" id="cat-general" name="category" type="radio" value="general">
                                        <label class="govuk-label govuk-radios__label govuk-label--s" for="cat-general">
                                            General Request
                                        </label>
                                        <div class="govuk-hint govuk-radios__hint">
                                            A tip, lead, or any other request for our team
                                        </div>
                                    </div>
                                </div>
                            </fieldset>
                        </div>

                        <button class="govuk-button" type="submit" id="category-submit-btn">
                            Continue
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `);

    initCategoryForm();
}

function initCategoryForm() {
    const form = document.getElementById('category-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const category = data.get('category');
        const errorEl = document.getElementById('category-error');
        const group = document.getElementById('category-group');

        if (!category) {
            errorEl.hidden = false;
            group.classList.add('govuk-form-group--error');
            return;
        }

        renderForm(category);
    });
}

function renderForm(category) {
    const cfg = CATEGORIES[category];

    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">
                    <a href="#" class="govuk-back-link" id="req-back-link">Back</a>
                    <span class="govuk-caption-xl">${cfg.caption}</span>
                    <h1 class="govuk-heading-xl">${cfg.heading}</h1>
                    <p class="govuk-body">${cfg.intro}</p>
                    <p class="govuk-body govuk-hint">
                        Your contact details are optional but help us follow up if we need more information.
                    </p>

                    <form id="request-form" novalidate>

                        <div class="govuk-error-summary" id="request-error-summary"
                             data-module="govuk-error-summary" hidden role="alert" tabindex="-1">
                            <div>
                                <h2 class="govuk-error-summary__title">There is a problem</h2>
                                <div class="govuk-error-summary__body">
                                    <ul class="govuk-list govuk-error-summary__list"></ul>
                                </div>
                            </div>
                        </div>

                        <div class="govuk-form-group" id="req-title-group">
                            <label class="govuk-label govuk-label--s" for="req-title">Title</label>
                            <p id="req-title-hint" class="govuk-hint">${cfg.titleHint}</p>
                            <input class="govuk-input" id="req-title" name="title" type="text"
                                maxlength="200" aria-describedby="req-title-hint req-title-error" required>
                            <p id="req-title-error" class="govuk-error-message" hidden>
                                <span class="govuk-visually-hidden">Error:</span>
                            </p>
                        </div>

                        <div class="govuk-form-group" id="req-description-group">
                            <label class="govuk-label govuk-label--s" for="req-description">Description</label>
                            <p id="req-description-hint" class="govuk-hint">${cfg.descriptionHint}</p>
                            <textarea class="govuk-textarea" id="req-description" name="description"
                                rows="6" maxlength="5000"
                                aria-describedby="req-description-hint req-description-error" required></textarea>
                            <p id="req-description-error" class="govuk-error-message" hidden>
                                <span class="govuk-visually-hidden">Error:</span>
                            </p>
                        </div>

                        <div class="govuk-form-group" id="req-source-group">
                            <label class="govuk-label govuk-label--s" for="req-source">
                                Source URL <span class="govuk-hint" style="display:inline">(optional)</span>
                            </label>
                            <p id="req-source-hint" class="govuk-hint">${cfg.sourceHint}</p>
                            <input class="govuk-input" id="req-source" name="source_url" type="url"
                                maxlength="1000" aria-describedby="req-source-hint req-source-error">
                            <p id="req-source-error" class="govuk-error-message" hidden>
                                <span class="govuk-visually-hidden">Error:</span>
                            </p>
                        </div>

                        <div class="govuk-form-group" id="req-contact-group">
                            <label class="govuk-label govuk-label--s" for="req-contact">
                                Your contact email <span class="govuk-hint" style="display:inline">(optional)</span>
                            </label>
                            <p id="req-contact-hint" class="govuk-hint">Only used to follow up on your submission</p>
                            <input class="govuk-input" id="req-contact" name="contact" type="email"
                                maxlength="254" autocomplete="email"
                                aria-describedby="req-contact-hint req-contact-error">
                            <p id="req-contact-error" class="govuk-error-message" hidden>
                                <span class="govuk-visually-hidden">Error:</span>
                            </p>
                        </div>

                        <button class="govuk-button" type="submit" id="req-submit-btn">${cfg.submitLabel}</button>

                    </form>
                </div>
            </div>
        </div>
    `);

    document.getElementById('req-back-link').addEventListener('click', (e) => {
        e.preventDefault();
        renderCategorySelection();
    });

    initRequestForm(category, cfg);
}

function initRequestForm(category, cfg) {
    const form = document.getElementById('request-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors(form);

        const data = new FormData(form);
        const title = data.get('title')?.trim() ?? '';
        const description = data.get('description')?.trim() ?? '';
        const source_url = data.get('source_url')?.trim() ?? '';
        const contact = data.get('contact')?.trim() ?? '';

        const errors = [];

        if (!title) {
            setFieldError('req-title', 'Enter a title');
            errors.push({ fieldId: 'req-title', message: 'Enter a title' });
        }
        if (!description) {
            setFieldError('req-description', 'Enter a description');
            errors.push({ fieldId: 'req-description', message: 'Enter a description' });
        }
        if (source_url && !isValidUrl(source_url)) {
            setFieldError('req-source', 'Enter a valid URL, for example https://example.com');
            errors.push({ fieldId: 'req-source', message: 'Enter a valid URL' });
        }

        if (errors.length) {
            showErrorSummary(form, errors);
            return;
        }

        const btn = document.getElementById('req-submit-btn');
        setButtonLoading(btn, 'Submitting…');

        try {
            await createSubmission({ title, description, source_url, contact, category });
            form.innerHTML = `
                <div class="govuk-notification-banner govuk-notification-banner--success"
                     role="alert" aria-labelledby="req-success-title"
                     data-module="govuk-notification-banner">
                    <div class="govuk-notification-banner__header">
                        <h2 class="govuk-notification-banner__title" id="req-success-title">Success</h2>
                    </div>
                    <div class="govuk-notification-banner__content">
                        <p class="govuk-notification-banner__heading">${cfg.successHeading}</p>
                        <p class="govuk-body">${cfg.successBody}</p>
                    </div>
                </div>
            `;
        } catch (err) {
            resetButton(btn, cfg.submitLabel);
            const summary = form.querySelector('.govuk-error-summary');
            const list = summary?.querySelector('.govuk-error-summary__list');
            if (summary && list) {
                list.innerHTML = `<li><a href="#">Something went wrong. Please try again.</a></li>`;
                summary.hidden = false;
                summary.focus();
            }
        }
    });
}

function isValidUrl(value) {
    try { new URL(value); return true; } catch { return false; }
}
