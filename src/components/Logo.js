// Logo.js
export function renderLogo(selector) {
  const container = document.querySelector(selector);
  if (!container) return;

  const logoHTML = `
    <div class="header item logo-container" style="cursor: pointer; display: flex; align-items: flex-end; height: 100%; font-size: 1.1em;">
      THE_<span class="not-operator" style="color: #ff2733; font-weight: bold;">!</span><i class="tag icon" style="margin-bottom: 2px;"></i>
    </div>
  `;

  container.innerHTML = logoHTML;

  container.addEventListener('click', () => {
    window.location.href = '/';
  });
}