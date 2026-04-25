import { updateContent } from '../components/Layout.js';

export function renderAbout() {
    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">
                    <h1 class="govuk-heading-xl">About</h1>
                    <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible govuk-!-margin-bottom-6">
                    <p class="govuk-body-l govuk-!-colour-secondary">Content coming soon.</p>
                </div>
            </div>
        </div>
    `);
}