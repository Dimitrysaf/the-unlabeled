// src/components/ErrorPage.js
import { updateContent } from './Layout.js';

export function renderError(code = 'Unknown') {
    const errorMessages = {
        '404': 'Page Not Found',
        '500': 'Internal Server Error',
        '505': 'HTTP Version Not Supported'
    };

    const message = errorMessages[code] || 'An unknown error occurred';

    const errorHtml = `
        <div class="ui middle aligned center aligned grid" style="min-height: 60vh;">
            <div class="column">
                <h1 class="ui icon header" style="color: gray; font-size: 2.5rem;">
                    <i class="huge exclamation triangle icon"></i>
                    <div class="content" style="margin-top: 20px;">
                        Error ${code}
                        <div class="sub header" style="font-size: 1.5rem; margin-top: 10px;">
                            ${message}.
                        </div>
                    </div>
                </h1>
                <div class="ui hidden divider"></div>
                <button class="ui primary large button" onclick="window.location.href='/'">
                    <i class="home icon"></i>Home
                </button>
            </div>
        </div>
    `;

    updateContent(errorHtml);
}