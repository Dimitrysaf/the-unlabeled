import { updateContent } from '../components/Layout.js';

export function renderLegal() {
  updateContent(`
<div class="govuk-!-padding-bottom-9">
  <div class="govuk-grid-row">
    <div class="govuk-grid-column-full">

      <h1 class="govuk-heading-xl govuk-!-margin-bottom-6">Legal</h1>

      <div class="govuk-tabs">
        <h2 class="govuk-tabs__title">Contents</h2>
        <ul class="govuk-tabs__list">
          <li class="govuk-tabs__list-item govuk-tabs__list-item--selected">
            <a class="govuk-tabs__tab" href="#privacy">Privacy Policy</a>
          </li>
          <li class="govuk-tabs__list-item">
            <a class="govuk-tabs__tab" href="#terms">Terms of Use</a>
          </li>
        </ul>

        <!-- ===================== PRIVACY ===================== -->
        <div class="govuk-tabs__panel" id="privacy">
          <h2 class="govuk-heading-l">Privacy Policy</h2>
          <p class="govuk-body govuk-!-colour-secondary govuk-!-margin-bottom-6">Last updated: April 2026</p>

          <h3 class="govuk-heading-m">1. Who We Are</h3>
          <p class="govuk-body">
            The Unlabeled is an independent news and analysis platform. For the purposes of the General Data Protection Regulation
            (EU) 2016/679 (<strong>GDPR</strong>) and any applicable national implementing legislation, The Unlabeled acts as the
            <strong>data controller</strong> for personal data collected through this website.
          </p>
          <p class="govuk-body">
            If you have any questions about this policy or how your data is handled, you can contact us via the details provided at
            the bottom of this page.
          </p>

          <h3 class="govuk-heading-m">2. What Personal Data We Collect</h3>
          <p class="govuk-body">We collect only the minimum data necessary to operate the service. This includes:</p>
          <ul class="govuk-list govuk-list--bullet">
            <li><strong>Account data</strong> — your email address, display name, and encrypted password when you register for an account.</li>
            <li><strong>Authentication data</strong> — session tokens and timestamps used to keep you signed in securely.</li>
            <li><strong>Usage data</strong> — if you have consented to analytics cookies, anonymised data about pages visited, time spent on the site, and device/browser type via Vercel Analytics. This data does not identify you personally.</li>
            <li><strong>Communications</strong> — any messages or feedback you send to us directly.</li>
          </ul>
          <p class="govuk-body">We do not collect sensitive categories of personal data (such as health, biometric, or financial information).</p>

          <h3 class="govuk-heading-m">3. Legal Basis for Processing</h3>
          <p class="govuk-body">Under GDPR Article 6, we process your personal data on the following legal bases:</p>
          <ul class="govuk-list govuk-list--bullet">
            <li><strong>Contractual necessity (Art. 6(1)(b))</strong> — to provide you with an account and the services you have requested, such as managing your login and preferences.</li>
            <li><strong>Legitimate interests (Art. 6(1)(f))</strong> — to maintain the security, integrity, and performance of the platform. Our legitimate interests do not override your rights and freedoms.</li>
            <li><strong>Consent (Art. 6(1)(a))</strong> — for optional analytics cookies. You can withdraw this consent at any time via our <a class="govuk-link" href="/cookies">cookie settings page</a>.</li>
            <li><strong>Legal obligation (Art. 6(1)(c))</strong> — where required by applicable law.</li>
          </ul>

          <h3 class="govuk-heading-m">4. Cookies and Tracking</h3>
          <p class="govuk-body">We use two categories of cookies:</p>
          <ul class="govuk-list govuk-list--bullet">
            <li><strong>Essential cookies</strong> — required for the website to function (for example, keeping you logged in). These cannot be disabled.</li>
            <li><strong>Analytics cookies</strong> — used to understand how the site is used. These are only set with your explicit consent.</li>
          </ul>
          <p class="govuk-body">You can review and change your cookie preferences at any time here: <a class="govuk-link" href="/cookies">cookie settings page</a>.</p>

          <h3 class="govuk-heading-m">5. How We Use Your Data</h3>
          <p class="govuk-body">We use personal data solely for the following purposes:</p>
          <ul class="govuk-list govuk-list--bullet">
            <li>Creating and managing your account</li>
            <li>Authenticating your identity when you sign in</li>
            <li>Responding to your enquiries or feedback</li>
            <li>Improving the platform through anonymised analytics (with your consent)</li>
            <li>Ensuring the security and preventing abuse of the service</li>
          </ul>
          <p class="govuk-body">We do not sell, rent, or trade your personal data to any third party for marketing purposes.</p>

          <h3 class="govuk-heading-m">6. Data Sharing and Third-Party Processors</h3>
          <p class="govuk-body">
            We use a limited number of trusted third-party services to operate the platform. Each acts as a data processor on our behalf
            and is contractually bound to process data only as instructed:
          </p>
          <ul class="govuk-list govuk-list--bullet">
            <li><strong>Supabase</strong> — provides our database and authentication infrastructure. Data may be stored in data centres within the EU or EEA. Supabase is compliant with GDPR.</li>
            <li><strong>Vercel</strong> — hosts the website and, if you have consented, provides anonymised analytics. Vercel processes data in accordance with its Data Processing Agreement.</li>
          </ul>
          <p class="govuk-body">
            We do not share personal data with any other third parties unless required to do so by law or a competent authority.
          </p>

          <h3 class="govuk-heading-m">7. International Data Transfers</h3>
          <p class="govuk-body">
            Some of our third-party processors may operate outside the European Economic Area (EEA). Where this occurs, we ensure that
            appropriate safeguards are in place, such as Standard Contractual Clauses (SCCs) approved by the European Commission, to
            protect your data in accordance with GDPR requirements.
          </p>

          <h3 class="govuk-heading-m">8. Data Retention</h3>
          <p class="govuk-body">We retain personal data only for as long as necessary:</p>
          <ul class="govuk-list govuk-list--bullet">
            <li><strong>Account data</strong> — retained for as long as your account is active. If you delete your account, your data is removed within 30 days, except where retention is required by law.</li>
            <li><strong>Authentication logs</strong> — retained for up to 90 days for security purposes.</li>
            <li><strong>Analytics data</strong> — anonymised and aggregated; not linked to your identity and retained for up to 12 months.</li>
          </ul>

          <h3 class="govuk-heading-m">9. Your Rights Under GDPR</h3>
          <p class="govuk-body">As a data subject under GDPR, you have the following rights:</p>
          <ul class="govuk-list govuk-list--bullet">
            <li><strong>Right of access (Art. 15)</strong> — you may request a copy of the personal data we hold about you.</li>
            <li><strong>Right to rectification (Art. 16)</strong> — you may ask us to correct inaccurate or incomplete data.</li>
            <li><strong>Right to erasure (Art. 17)</strong> — you may request that we delete your personal data ("right to be forgotten"), subject to certain exceptions.</li>
            <li><strong>Right to restriction of processing (Art. 18)</strong> — you may ask us to restrict how we use your data in certain circumstances.</li>
            <li><strong>Right to data portability (Art. 20)</strong> — you may request your data in a structured, machine-readable format.</li>
            <li><strong>Right to object (Art. 21)</strong> — you may object to processing based on legitimate interests.</li>
            <li><strong>Right to withdraw consent</strong> — where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.</li>
          </ul>
          <p class="govuk-body">
            To exercise any of these rights, please contact us. We will respond within <strong>one calendar month</strong> as required
            by GDPR Article 12.
          </p>

          <h3 class="govuk-heading-m">10. Right to Lodge a Complaint</h3>
          <p class="govuk-body">
            If you believe your data has been handled unlawfully, you have the right to lodge a complaint with your national data
            protection supervisory authority. In the EU, a list of national authorities is available on the European Data Protection
            Board's website.
          </p>

          <h3 class="govuk-heading-m">11. Data Security</h3>
          <p class="govuk-body">
            We implement appropriate technical and organisational measures to protect personal data against unauthorised access,
            alteration, disclosure, or destruction. Passwords are never stored in plain text. All data in transit is encrypted
            using TLS.
          </p>

          <h3 class="govuk-heading-m">12. Changes to This Policy</h3>
          <p class="govuk-body">
            We may update this policy from time to time. Significant changes will be communicated to registered users by email.
            The "last updated" date at the top of this page will always reflect the most recent revision. Continued use of the
            platform after changes are posted constitutes your acknowledgement of the updated policy.
          </p>
        </div>

        <!-- ===================== TERMS ===================== -->
        <div class="govuk-tabs__panel" id="terms" style="display:none">
          <h2 class="govuk-heading-l">Terms of Use</h2>
          <p class="govuk-body govuk-!-colour-secondary govuk-!-margin-bottom-6">Last updated: April 2026</p>

          <h3 class="govuk-heading-m">1. Acceptance of Terms</h3>
          <p class="govuk-body">
            By accessing or using The Unlabeled ("the platform", "we", "us"), you agree to be bound by these Terms of Use. If you
            do not agree, you must not use the platform. These terms apply in addition to any applicable laws and regulations,
            including those of the European Union.
          </p>

          <h3 class="govuk-heading-m">2. Description of Service</h3>
          <p class="govuk-body">
            The Unlabeled is an independent digital platform providing news analysis, data visualisations, and editorial commentary.
            The platform is provided free of charge. We reserve the right to modify, suspend, or discontinue any part of the
            service at any time with reasonable notice where possible.
          </p>

          <h3 class="govuk-heading-m">3. Eligibility</h3>
          <p class="govuk-body">
            To create an account, you must be at least <strong>16 years of age</strong>, in accordance with the age of digital
            consent under GDPR Article 8 and applicable national law. By registering, you confirm that you meet this requirement.
          </p>

          <h3 class="govuk-heading-m">4. User Accounts</h3>
          <p class="govuk-body">
            You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs
            under your account. You must notify us immediately of any suspected unauthorised use. We are not liable for any loss
            arising from unauthorised use of your account where you have failed to take reasonable precautions.
          </p>
          <p class="govuk-body">
            You may not create an account on behalf of another person without their explicit consent.
          </p>

          <h3 class="govuk-heading-m">5. Acceptable Use</h3>
          <p class="govuk-body">You agree not to use the platform to:</p>
          <ul class="govuk-list govuk-list--bullet">
            <li>Publish or transmit content that is unlawful, defamatory, obscene, or otherwise objectionable</li>
            <li>Engage in harassment, abuse, threats, or hate speech targeting individuals or groups</li>
            <li>Infringe the intellectual property rights of others</li>
            <li>Distribute malware, spam, or unauthorised automated requests</li>
            <li>Attempt to gain unauthorised access to any part of the platform or its infrastructure</li>
            <li>Misrepresent your identity or impersonate another person or entity</li>
          </ul>
          <p class="govuk-body">
            We reserve the right to suspend or terminate accounts that violate these rules, without prior notice in serious cases.
          </p>

          <h3 class="govuk-heading-m">6. Intellectual Property</h3>
          <p class="govuk-body">
            All editorial content, design, and source code on the platform is owned by or licensed to The Unlabeled. You may not
            reproduce, distribute, or create derivative works from our content without prior written permission, except where
            permitted by applicable law (such as fair dealing or quotation for the purposes of criticism or review).
          </p>
          <p class="govuk-body">
            The source code for this platform is made available under an open-source licence. Please refer to the repository for
            full licence terms.
          </p>

          <h3 class="govuk-heading-m">7. Third-Party Content and Links</h3>
          <p class="govuk-body">
            The platform may contain links to external websites or reference third-party sources. These are provided for
            informational purposes only. We do not endorse, control, or accept responsibility for the content or practices of any
            third-party site. You access external links at your own risk.
          </p>

          <h3 class="govuk-heading-m">8. Disclaimer of Warranties</h3>
          <p class="govuk-body">
            The platform and all content are provided <strong>"as is"</strong> and <strong>"as available"</strong> without any
            warranty of any kind, whether express or implied. We do not warrant that the service will be uninterrupted, error-free,
            or free from viruses or other harmful components.
          </p>
          <p class="govuk-body">
            Nothing on this platform constitutes legal, financial, or professional advice. You should seek independent advice
            before acting on any content.
          </p>

          <h3 class="govuk-heading-m">9. Limitation of Liability</h3>
          <p class="govuk-body">
            To the fullest extent permitted by applicable law, The Unlabeled shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages arising from your use of, or inability to use, the platform — including
            reliance on any content published here.
          </p>
          <p class="govuk-body">
            Nothing in these terms limits or excludes liability that cannot be excluded under EU consumer protection law,
            including liability for death or personal injury caused by our negligence, or for fraud or fraudulent misrepresentation.
          </p>

          <h3 class="govuk-heading-m">10. Consumer Rights (EU)</h3>
          <p class="govuk-body">
            If you are a consumer based in the European Union, you may have additional rights under EU consumer law, including
            Directive 2011/83/EU on consumer rights and Directive 2019/770/EU on digital content and services. These terms do not
            limit any mandatory consumer rights you hold under applicable national law.
          </p>

          <h3 class="govuk-heading-m">11. Modifications to These Terms</h3>
          <p class="govuk-body">
            We may update these terms from time to time. We will provide reasonable notice of material changes — where practicable,
            by email to registered users or via a notice on the platform. Continued use of the service after changes take effect
            constitutes your acceptance of the revised terms.
          </p>

          <h3 class="govuk-heading-m">12. Governing Law and Jurisdiction</h3>
          <p class="govuk-body">
            These terms are governed by the laws of the European Union and the applicable national law of the jurisdiction in which
            The Unlabeled operates. Any disputes shall be subject to the exclusive jurisdiction of the competent courts of that
            jurisdiction, without prejudice to your rights as a consumer under mandatory local law.
          </p>

          <h3 class="govuk-heading-m">13. Severability</h3>
          <p class="govuk-body">
            If any provision of these terms is found to be invalid or unenforceable, the remaining provisions will continue to
            apply in full.
          </p>
        </div>

      </div>
    </div>
  </div>
</div>
`);

  initTabs();
  handleHashTab();
}

function initTabs() {
  const tabsList = document.querySelector('.govuk-tabs__list');
  if (!tabsList) return;

  tabsList.addEventListener('click', e => {
    const link = e.target.closest('.govuk-tabs__tab');
    if (!link) return;
    e.preventDefault();

    const targetId = link.getAttribute('href').slice(1);

    tabsList.querySelectorAll('.govuk-tabs__list-item').forEach(item => {
      item.classList.remove('govuk-tabs__list-item--selected');
    });
    link.closest('.govuk-tabs__list-item').classList.add('govuk-tabs__list-item--selected');

    document.querySelectorAll('.govuk-tabs__panel').forEach(panel => {
      panel.style.display = panel.id === targetId ? '' : 'none';
    });

    history.replaceState(null, '', `#${targetId}`);
  });
}

function handleHashTab() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  const panel = document.getElementById(hash);
  if (!panel || !panel.classList.contains('govuk-tabs__panel')) return;

  document.querySelectorAll('.govuk-tabs__panel').forEach(p => {
    p.style.display = 'none';
  });
  panel.style.display = '';

  document.querySelectorAll('.govuk-tabs__list-item').forEach(item => {
    item.classList.remove('govuk-tabs__list-item--selected');
    const link = item.querySelector('.govuk-tabs__tab');
    if (link && link.getAttribute('href') === `#${hash}`) {
      item.classList.add('govuk-tabs__list-item--selected');
    }
  });
}
