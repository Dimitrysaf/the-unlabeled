// src/pages/about.js
import { updateContent } from '../components/Layout.js';

export function renderAbout() {
    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">
                    <h1 class="govuk-heading-xl">About The Unlabeled</h1>
                    
                    <p class="govuk-body-l">
                        A political blog and data initiative. We provide analysis, political facts, and commentary 
                        rooted in evidence that the mainstream often leaves behind.
                    </p>

                    <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible govuk-!-margin-bottom-6">

                    <h2 class="govuk-heading-l">Our mission</h2>
                    <p class="govuk-body">
                        In a world driven by metadata and classification, "unlabeled" information is often ignored. 
                        Whether it is research data, community feedback, or technical logs, we believe that 
                        every data point has value.
                    </p>
                    <p class="govuk-body">
                        This project provides the tools to visualize and process these datasets, ensuring 
                        that nothing important remains hidden simply because it lacks a tag.
                    </p>

                    <h2 class="govuk-heading-m">Politics and Facts</h2>
                    <p class="govuk-body">
                        Narratives can be manipulated, but raw data is harder to ignore. <strong>The Unlabeled</strong> 
                        focuses on political facts—using unprocessed information to verify claims and expose 
                        gaps in public discourse. We prioritize objective analysis over partisan labels.
                    </p>

                    <h2 class="govuk-heading-m">We want your help</h2>
                    <p class="govuk-body">
                        The Unlabeled is a community-driven effort. We are currently looking for:
                    </p>
                    <ul class="govuk-list govuk-list--bullet">
                        <li><strong>Feedback:</strong> Tell us what data you want to see or how we can improve our clarity.</li>
                        <li><strong>Volunteers:</strong> We need people to help with data verification, technical development, and research.</li>
                        <li><strong>Contributors:</strong> If you have political facts or data-driven insights that need a platform, get in touch.</li>
                    </ul>

                    <p class="govuk-body">
                        You can track our progress and contribute directly on 
                        <a href="https://github.com/Dimitrysaf/the-unlabeled" class="govuk-link">GitHub</a>.
                    </p>

                    <h2 class="govuk-heading-m">Get in touch</h2>
                    <p class="govuk-body">
                        If you want to volunteer, provide feedback, or share data, reach out to us.
                    </p>

                    <a href="mailto:demetresmeliates+incontact@gmail.com?subject=Volunteering%20and%20Feedback%20-%20The%20Unlabeled" 
                       role="button" 
                       draggable="false" 
                       class="govuk-button govuk-!-margin-top-3" 
                       data-module="govuk-button">
                        Email the project
                    </a>
                </div>
            </div>
        </div>
    `);
}