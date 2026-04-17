// ErrorPage.js
import { updateContent } from './Layout.js';

export function renderError(code = 'Unknown') {
    const errorMessages = {
        '404': 'Page not found. Return to the homepage?',
        '500': 'Internal server error. Try again later.',
        '505': 'The HTTP version is not supported.'
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
                            ${message}
                        </div>
                    </div>
                </h1>
                <br/>
                <button class="ui primary large button" onclick="window.location.href='/'">
                    <i class="home icon"></i>Home
                </button>
            </div>
        </div>
    `;

    updateContent(errorHtml);
}