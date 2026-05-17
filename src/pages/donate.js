// src/pages/donate.js
import { updateContent } from '../components/Layout.js';
import './donate.css';

export function renderDonate() {
    updateContent(`
        <div class="govuk-width-container govuk-!-padding-top-6 govuk-!-padding-bottom-9">
            <h1 class="govuk-heading-xl">Support The Unlabeled</h1>
            <div class="donate-layout">
                <div class="donate-intro">
                    <p class="govuk-body-l">
                        The Unlabeled is independent, free to read, and carries no paywalls.
                    </p>
                    <p class="govuk-body">
                        To be completely honest: the only real cost of running this site is
                        <strong>$11.45 per year</strong> for the domain name. Hosting and infrastructure
                        (Vercel, Supabase) are free. So no, you are not keeping the lights on —
                        the lights are already on.
                    </p>
                    <p class="govuk-body">
                        What a donation does is act as a <strong>motivation</strong> to keep going —
                        a signal that the work is worth doing. Writing in-depth political analysis
                        takes time, and knowing that even one person found it valuable enough to
                        contribute makes a real difference.
                    </p>
                    <p class="govuk-body govuk-!-colour-secondary">
                        You can donate once or set up a monthly contribution — whatever works for you.
                        No account required.
                    </p>
                </div>
                <div class="donate-widget-panel">
                    <iframe
                        id="kofiframe"
                        src="https://ko-fi.com/theunlabeled/?hidefeed=true&widget=true&embed=true"
                        height="580"
                        title="Support The Unlabeled on Ko-fi"
                        loading="lazy"
                    ></iframe>
                </div>
            </div>
        </div>
    `);
}
