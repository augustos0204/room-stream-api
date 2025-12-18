/**
 * XSS Sanitization Utility
 * Provides safe HTML escaping to prevent XSS attacks
 */

const Sanitizer = {
    /**
     * Escapes HTML special characters to prevent XSS
     * @param {string} unsafe - Unsafe user input
     * @returns {string} Escaped safe string
     */
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';

        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    /**
     * Sanitizes text but allows basic formatting tags (bold, italic, links)
     * Use with caution - only for trusted minimal HTML
     * @param {string} text - Text to sanitize
     * @returns {string} Sanitized text with safe tags
     */
    sanitizeWithBasicFormatting(text) {
        if (typeof text !== 'string') return '';

        // First escape everything
        let safe = this.escapeHtml(text);

        // Then allow only specific safe tags back
        safe = safe
            .replace(/&lt;strong&gt;/g, '<strong>')
            .replace(/&lt;\/strong&gt;/g, '</strong>')
            .replace(/&lt;em&gt;/g, '<em>')
            .replace(/&lt;\/em&gt;/g, '</em>')
            .replace(/&lt;br&gt;/g, '<br>');

        return safe;
    },

    /**
     * Converts URLs in text to clickable links (safely)
     * @param {string} text - Text that may contain URLs
     * @returns {string} Text with clickable links
     */
    linkify(text) {
        if (typeof text !== 'string') return '';

        const urlPattern = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;

        return text.replace(urlPattern, (url) => {
            // Escape the URL to prevent XSS
            const safeUrl = this.escapeHtml(url);
            return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">${safeUrl}</a>`;
        });
    },

    /**
     * Sanitizes message content for chat display
     * Escapes HTML but converts URLs to safe links
     * @param {string} message - User message
     * @returns {string} Safe HTML for display
     */
    sanitizeMessage(message) {
        if (typeof message !== 'string') return '';

        // First escape all HTML
        let safe = this.escapeHtml(message);

        // Then linkify URLs
        safe = this.linkify(safe);

        return safe;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sanitizer;
}
