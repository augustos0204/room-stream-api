/**
 * Toast Notification System
 * Provides user feedback for actions and events
 */

class ToastManager {
    constructor() {
        this.container = null;
        this.maxToasts = 3; // Máximo de toasts simultâneos
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            // Mobile: top-center (topSheet style), Desktop: top-right (original)
            this.container.className = 'fixed top-4 left-1/2 -translate-x-1/2 md:top-20 md:left-auto md:right-4 md:translate-x-0 w-[calc(100%-2rem)] max-w-sm';
            
            // Apply critical styles via inline style with !important to guarantee it overlays everything
            this.container.style.cssText = `
                position: fixed !important;
                z-index: 99999 !important;
                pointer-events: none !important;
                min-height: 80px;
            `;
            
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
        // Verificar limite de toasts
        const currentToasts = this.container.children;
        if (currentToasts.length >= this.maxToasts) {
            // Remover o toast mais antigo (último da lista)
            const oldestToast = currentToasts[currentToasts.length - 1];
            this.remove(oldestToast);
        }

        const toastWrapper = this.createToast(message, type);
        
        // Adicionar no TOPO (prepend) - mais recente no topo, mais antigo no fundo
        this.container.prepend(toastWrapper);

        // Animate in - two-step animation
        requestAnimationFrame(() => {
            // First update cascade positions for existing toasts
            this.updateCascadePositions();
            
            // Then animate the new toast in
            requestAnimationFrame(() => {
                toastWrapper.style.transform = 'translateY(0px) scale(1)';
                toastWrapper.style.opacity = '1';
            });
        });

        // Animate progress bar
        if (duration > 0) {
            this.animateProgressBar(toastWrapper, duration);
            
            // Auto remove after duration
            setTimeout(() => {
                this.remove(toastWrapper);
            }, duration);
        }

        return toastWrapper;
    }

    animateProgressBar(toast, duration) {
        const progressBar = toast._progressBar;
        if (!progressBar) return;

        // Start animation after a small delay to ensure toast is visible
        setTimeout(() => {
            progressBar.style.transitionDuration = `${duration}ms`;
            progressBar.style.width = '0%';
        }, 50);
    }

    createToast(message, type) {
        const toastWrapper = document.createElement('div');
        // Wrapper for toast + progress bar with transitions
        toastWrapper.className = 'absolute top-0 left-0 right-0 overflow-hidden rounded-lg transition-all duration-300 ease-out';
        toastWrapper.style.transform = 'translateY(-100%)';
        toastWrapper.style.opacity = '0';
        toastWrapper.style.pointerEvents = 'auto';
        
        const toast = document.createElement('div');
        // Toast content
        toast.className = `flex items-start gap-3 p-4 shadow-lg border backdrop-blur-sm relative
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
        closeButton.onclick = () => this.remove(toastWrapper);

        toast.appendChild(iconElement);
        toast.appendChild(messageElement);
        toast.appendChild(closeButton);

        // Progress bar with glow effect
        const progressBar = document.createElement('div');
        progressBar.className = 'absolute bottom-0 left-0 h-1 transition-all ease-linear';
        progressBar.style.width = '100%';
        
        // Get progress bar color and glow based on type
        const progressColors = this.getProgressBarColors(type);
        progressBar.style.background = progressColors.bg;
        progressBar.style.boxShadow = progressColors.glow;
        
        toast.appendChild(progressBar);
        toastWrapper.appendChild(toast);
        
        // Store progress bar reference for animation
        toastWrapper._progressBar = progressBar;

        // Initialize Lucide icons for this toast
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons({ nameAttr: 'data-lucide' }), 0);
        }

        return toastWrapper;
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

    getProgressBarColors(type) {
        const colors = {
            success: {
                bg: 'linear-gradient(to right, #10b981, #059669)',
                glow: '0 0 10px rgba(16, 185, 129, 0.6), 0 0 20px rgba(16, 185, 129, 0.4), 0 0 30px rgba(16, 185, 129, 0.2)'
            },
            error: {
                bg: 'linear-gradient(to right, #ef4444, #dc2626)',
                glow: '0 0 10px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.4), 0 0 30px rgba(239, 68, 68, 0.2)'
            },
            warning: {
                bg: 'linear-gradient(to right, #f59e0b, #d97706)',
                glow: '0 0 10px rgba(245, 158, 11, 0.6), 0 0 20px rgba(245, 158, 11, 0.4), 0 0 30px rgba(245, 158, 11, 0.2)'
            },
            info: {
                bg: 'linear-gradient(to right, #3b82f6, #2563eb)',
                glow: '0 0 10px rgba(59, 130, 246, 0.6), 0 0 20px rgba(59, 130, 246, 0.4), 0 0 30px rgba(59, 130, 246, 0.2)'
            }
        };
        return colors[type] || colors.info;
    }

    updateCascadePositions() {
        const toasts = Array.from(this.container.children);
        toasts.forEach((toast, index) => {
            // Index 0 = mais recente (topo), index 1+ = mais antigos (empilhados para BAIXO)
            // Since toasts are at top of screen, they should stack DOWNWARDS
            const offset = index * 10; // 10px de offset vertical para baixo (efeito cascata invertido)
            const scale = Math.max(0.90, 1 - (index * 0.05)); // Reduz 5% de escala, mínimo 90%
            const opacity = Math.max(0.7, 1 - (index * 0.10)); // Reduz 10% de opacidade, mínimo 70%
            
            // Apply cascade styling - offset positivo empilha para baixo
            toast.style.transform = `translateY(${offset}px) scale(${scale})`;
            toast.style.opacity = `${opacity}`;
            // Z-index relativo dentro do container (não precisa ser muito alto aqui)
            toast.style.zIndex = (10 - index).toString();
            
            // Ensure transition is applied
            if (!toast.style.transition || toast.style.transition === '') {
                toast.style.transition = 'transform 300ms ease-out, opacity 300ms ease-out';
            }
        });
    }

    remove(toastWrapper) {
        if (!toastWrapper || !toastWrapper.parentNode) return;
        
        // Animate out - slide up (out from top)
        toastWrapper.style.transition = 'transform 300ms ease-out, opacity 300ms ease-out';
        toastWrapper.style.transform = 'translateY(-100%) scale(0.8)';
        toastWrapper.style.opacity = '0';
        
        setTimeout(() => {
            if (toastWrapper.parentNode) {
                toastWrapper.parentNode.removeChild(toastWrapper);
                // Update cascade positions after removal - toasts below will move up
                this.updateCascadePositions();
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
