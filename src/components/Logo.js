// Logo.js
export function renderLogo(selector) {
  const container = document.querySelector(selector);
  if (!container) return;

  // Added color: #ff2733 directly to the exclamation mark span
  const logoHTML = `
    <div class="header item logo-container" style="cursor: pointer; display: flex; align-items: flex-end; height: 100%; font-size: 1.1em;">
      THE_<span class="not-operator" style="color: #ff2733; font-weight: bold;">!</span><i class="tag icon" style="margin-bottom: 2px;"></i>
    </div>
  `;

  container.innerHTML = logoHTML;

  // Optional: Add a click event to go home
  container.addEventListener('click', () => {
    window.location.href = '/';
  });
}