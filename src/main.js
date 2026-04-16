import $ from 'jquery';
import { initLayout, updateContent } from './components/Layout.js';

$(document).ready(function() {
    initLayout();
    
    // Testing the "Slot"
    updateContent(`
        <div class="ui segment">
            <h2>System Standby</h2>
            <p>The footer is now locked to the bottom via the Layout component's internal styles.</p>
        </div>
    `);
});