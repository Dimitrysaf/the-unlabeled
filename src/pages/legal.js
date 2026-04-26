import { updateContent } from '../components/Layout.js';

export function renderLegal() {
    updateContent(`
<div class="govuk-!-padding-bottom-9">
  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">

      <h1 class="govuk-heading-xl">Legal</h1>

      <p class="govuk-body govuk-!-colour-secondary">
        Jump to:
        <a class="govuk-link" href="#privacy">Privacy Policy</a>
        &nbsp;·&nbsp;
        <a class="govuk-link" href="#terms">Terms of Use</a>
      </p>

      <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible">

      <!-- ===================== PRIVACY ===================== -->

      <section id="privacy">
        <h2 class="govuk-heading-l">Privacy Policy</h2>

        <p class="govuk-body">
          The Unlabeled respects your privacy. We aim to collect as little data as possible and be transparent about how it is used.
        </p>

        <h3 class="govuk-heading-m">Information We Collect</h3>
        <p class="govuk-body">
          We may collect information that you voluntarily provide, such as messages, submissions, or feedback. We do not require account creation.
        </p>

        <h3 class="govuk-heading-m">How We Use Information</h3>
        <p class="govuk-body">
          Any information provided is used solely to operate, improve, and protect the platform. We do not sell or share your data with third parties.
        </p>

        <h3 class="govuk-heading-m">Cookies</h3>
        <p class="govuk-body">
          We use essential cookies required for basic functionality. You can choose whether to allow analytics cookies.
        </p>
        <p class="govuk-body">
          Manage your settings on our dedicated cookies page.
        </p>
        <a class="govuk-button govuk-button--secondary" data-module="govuk-button" href="/cookies">
          Cookie settings
        </a>

        <h3 class="govuk-heading-m">Data Retention</h3>
        <p class="govuk-body">
          We retain data only for as long as necessary to maintain the service and ensure its integrity.
        </p>

        <h3 class="govuk-heading-m">Your Rights</h3>
        <p class="govuk-body">
          You may request deletion of any content or data you have provided. Where applicable, you have rights under laws such as the General Data Protection Regulation (GDPR).
        </p>

        <h3 class="govuk-heading-m">Third-Party Links</h3>
        <p class="govuk-body">
          This platform may contain links to external sites. We are not responsible for their content or privacy practices.
        </p>

        <h3 class="govuk-heading-m">Changes to This Policy</h3>
        <p class="govuk-body">
          This policy may be updated over time. Continued use of the platform constitutes acceptance of any changes.
        </p>
      </section>

      <hr class="govuk-section-break govuk-section-break--l govuk-section-break--visible">

      <!-- ===================== TERMS ===================== -->

      <section id="terms">
        <h2 class="govuk-heading-l">Terms of Use</h2>

        <p class="govuk-body">
          By accessing or using The Unlabeled, you agree to these terms.
        </p>

        <h3 class="govuk-heading-m">Acceptable Use</h3>
        <p class="govuk-body">
          You agree not to use the platform for unlawful, harmful, or abusive purposes. This includes harassment, hate speech, or misuse of content.
        </p>

        <h3 class="govuk-heading-m">User Contributions</h3>
        <p class="govuk-body">
          You retain ownership of content you submit. However, by submitting content, you grant us a non-exclusive right to display and use it within the platform.
        </p>

        <h3 class="govuk-heading-m">Content Moderation</h3>
        <p class="govuk-body">
          We reserve the right to remove content that violates these terms or undermines the purpose of the platform.
        </p>

        <h3 class="govuk-heading-m">No Guarantees</h3>
        <p class="govuk-body">
          The platform is provided "as is" without warranties of any kind. We do not guarantee accuracy, availability, or reliability.
        </p>

        <h3 class="govuk-heading-m">Limitation of Liability</h3>
        <p class="govuk-body">
          We are not liable for any damages resulting from use of the platform, including reliance on user-generated content.
        </p>

        <h3 class="govuk-heading-m">Termination</h3>
        <p class="govuk-body">
          We reserve the right to restrict or terminate access to the platform at any time if these terms are violated.
        </p>

        <h3 class="govuk-heading-m">Governing Law</h3>
        <p class="govuk-body">
          These terms are governed by applicable laws and regulations. Jurisdiction will depend on the operating location of the service.
        </p>

      </section>

    </div>
  </div>
</div>
`);

    handleHashNavigation();
    setupScrollSpy();
    setupBackToTop();
}

/* ---------- Navigation Improvements ---------- */

function handleHashNavigation() {
    const scrollToHash = () => {
        const hash = window.location.hash;
        if (!hash) return;

        const target = document.querySelector(hash);
        if (target) {
            target.focus(); // accessibility
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Initial load
    scrollToHash();

    // Handle back/forward navigation
    window.addEventListener('hashchange', scrollToHash);
}

/* ---------- Scroll Spy (active section highlight) ---------- */

function setupScrollSpy() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.legal-nav-link');

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navLinks.forEach(link => {
                        link.classList.remove('govuk-link--active');
                        if (link.getAttribute('href') === `#${entry.target.id}`) {
                            link.classList.add('govuk-link--active');
                        }
                    });
                }
            });
        },
        { threshold: 0.5 }
    );

    sections.forEach(section => observer.observe(section));
}

/* ---------- Back to top ---------- */

function setupBackToTop() {
    const button = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            button.hidden = false;
        } else {
            button.hidden = true;
        }
    });

    button.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
