/**
 * Shared utility functions used across multiple webchat JS modules.
 * This file must be loaded before main.js, gps.js, and send-message.js.
 */

/**
 * Escape HTML special characters to prevent XSS attacks.
 * @param {string} text - The text to escape
 * @returns {string} - The escaped text safe for inserting as HTML content
 */
function escapeHtml(text) {
    if (text == null || text === undefined) {
        return '';
    }
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escape HTML attribute values to prevent XSS attacks.
 * Escapes both HTML entities and quotes.
 * @param {string} text - The text to escape for use in HTML attributes
 * @returns {string} - The escaped text safe for use in attributes
 */
function escapeHtmlAttribute(text) {
    if (text == null || text === undefined) {
        return '';
    }
    var div = document.createElement('div');
    div.textContent = text;
    var escaped = div.innerHTML;
    // Also escape quotes for attribute safety
    escaped = escaped.replace(/"/g, '&quot;');
    escaped = escaped.replace(/'/g, '&#x27;');
    return escaped;
}

/**
 * Escape JavaScript string for use in JavaScript code.
 * Escapes quotes and backslashes to prevent JS injection.
 * @param {string} text - The text to escape for use in JavaScript strings
 * @returns {string} - The escaped text safe for use in JavaScript strings
 */
function escapeJsString(text) {
    if (text == null || text === undefined) {
        return '';
    }
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}
