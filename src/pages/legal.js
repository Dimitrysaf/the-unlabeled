import { updateContent } from '../components/Layout.js';

export function renderLegal() {
    updateContent(`
        <div class="govuk-!-padding-top-6 govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">

                    <h1 class="govuk-heading-xl govuk-!-margin-bottom-2">Legal</h1>
                    <p class="govuk-body govuk-!-colour-secondary govuk-!-margin-bottom-6">
                        Jump to:
                        <a class="govuk-link" href="#privacy">Privacy Policy</a>
                        &nbsp;·&nbsp;
                        <a class="govuk-link" href="#terms">Terms of Use</a>
                    </p>
                    <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible govuk-!-margin-bottom-8">

                    <h2 class="govuk-heading-l" id="privacy">Privacy Policy</h2>
                    <p class="govuk-body-l govuk-!-colour-secondary">Content coming soon.</p>

                    <hr class="govuk-section-break govuk-section-break--l govuk-section-break--visible govuk-!-margin-top-9 govuk-!-margin-bottom-8">

                    <h2 class="govuk-heading-l" id="terms">Terms of Use</h2>
                    <p class="govuk-body-l govuk-!-colour-secondary">Content coming soon.</p>

                </div>
            </div>
        </div>
    `);

    // Scroll to the anchor after render if one is present in the URL
    const hash = window.location.hash;
    if (hash) {
        const target = document.querySelector(hash);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
}