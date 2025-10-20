/**
 * Toast Notification System
 * Provides user feedback for actions and events
 */

class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'fixed top-20 right-4 z-[100] space-y-2 max-w-sm';
            this.container.setAttribute('role', 'region');
            this.container.setAttribute('aria-label', 'Notificações');
            this.container.setAttribute('aria-live', 'polite');
            document.body.appendChild(this.container);
        }
    }

    /**
     * Shows a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Type: success, error, warning, info
     * @param {number} duration - Duration in ms (0 = no auto-close)
     */
    show(message, type = 'info', duration = 3000) {
        const toast = this.createToast(message, type);
        this.container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        });

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toast);
            }, duration);
        }

        return toast;
    }

    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `transform translate-x-full opacity-0 transition-all duration-300 ease-out
            flex items-start gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-sm
            ${this.getTypeClasses(type)}`;
        toast.setAttribute('role', 'alert');

        const icon = this.getIcon(type);
        const iconElement = document.createElement('i');
        iconElement.setAttribute('data-lucide', icon);
        iconElement.className = 'w-5 h-5 flex-shrink-0';

        const messageElement = document.createElement('div');
        messageElement.className = 'flex-1 text-sm font-medium';
        messageElement.textContent = message;

        const closeButton = document.createElement('button');
        closeButton.className = 'flex-shrink-0 hover:opacity-70 transition-opacity';
        closeButton.innerHTML = '<i data-lucide="x" class="w-4 h-4"></i>';
        closeButton.setAttribute('aria-label', 'Fechar notificação');
        closeButton.onclick = () => this.remove(toast);

        toast.appendChild(iconElement);
        toast.appendChild(messageElement);
        toast.appendChild(closeButton);

        // Initialize Lucide icons for this toast
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons({ nameAttr: 'data-lucide' }), 0);
        }

        return toast;
    }

    getTypeClasses(type) {
        const classes = {
            success: 'bg-green-900/90 border-green-500 text-green-100',
            error: 'bg-red-900/90 border-red-500 text-red-100',
            warning: 'bg-yellow-900/90 border-yellow-500 text-yellow-100',
            info: 'bg-blue-900/90 border-blue-500 text-blue-100'
        };
        return classes[type] || classes.info;
    }

    getIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        return icons[type] || icons.info;
    }

    remove(toast) {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 4000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 3500) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
}

// Create global instance
const Toast = new ToastManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ToastManager, Toast };
}
