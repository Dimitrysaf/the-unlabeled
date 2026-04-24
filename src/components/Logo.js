export function renderLogo(selector) {
    const container = document.querySelector(selector);
    if (!container) return;

    container.innerHTML = `
        <a class="nav-brand" href="/" aria-label="The Unlabeled — Home">
            THE_<span class="logo-bang">!</span><i class="fa-solid fa-tag logo-tag"></i>
        </a>
    `;

    container.querySelector('.nav-brand').addEventListener('click', e => {
        e.preventDefault();
        window.location.href = '/';
    });
}