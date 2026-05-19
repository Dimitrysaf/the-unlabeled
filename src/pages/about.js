// src/pages/about.js
import { updateContent } from '../components/Layout.js';

export function renderAbout() {
    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">
                    <h1 class="govuk-heading-xl">About</h1>

                    <p class="govuk-body-l">
                        I write about things I find worth researching — politics, technology, culture, or whatever
                        else crosses my mind. The subject changes. The approach doesn't.
                    </p>

                    <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible govuk-!-margin-bottom-6">

                    <h2 class="govuk-heading-m">What this is</h2>
                    <p class="govuk-body">
                        Not a newspaper. Not a newsletter. Just a place where I put things I've looked into
                        properly — backed by sources, checked against data, and written honestly about what
                        I actually think.
                    </p>
                    <p class="govuk-body">
                        The bar I try to hold myself to: before writing something, understand it. That means
                        reading the primary source, not just the headline. It means being clear when something
                        is an opinion rather than a fact. And it means correcting things that turn out to be wrong.
                    </p>
                    <p class="govuk-body">
                        Topics range from Greek politics and European affairs to technology, history, economics,
                        and anything else that seems genuinely interesting. There's no fixed niche — if I've
                        spent time understanding something, it might end up here.
                    </p>

                    <h2 class="govuk-heading-m">Why "Unlabeled"?</h2>
                    <p class="govuk-body">
                        We sort information into categories before we understand it. Anything that doesn't
                        fit neatly — unlabeled data, cross-disciplinary research, ideas that span more than
                        one field — tends to get ignored.
                    </p>
                    <p class="govuk-body">
                        This site is the same. It doesn't fit one box. That's intentional.
                    </p>

                    <h2 class="govuk-heading-m">Get in touch</h2>
                    <p class="govuk-body">
                        Feedback, corrections, or just something you think is worth looking into — reach out.
                    </p>
                    <p class="govuk-body">
                        The source code is also available on
                        <a href="https://github.com/Dimitrysaf/the-unlabeled" class="govuk-link">GitHub</a>
                        if that's your kind of thing.
                    </p>

                    <a href="mailto:demetresmeliates+incontact@gmail.com?subject=The%20Unlabeled"
                       role="button"
                       draggable="false"
                       class="govuk-button govuk-!-margin-top-3"
                       data-module="govuk-button">
                        Send an email
                    </a>
                </div>
            </div>
        </div>
    `);
}
