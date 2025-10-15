/**
 * Custom Toast Notification System
 * Simple replacement for react-hot-toast
 */

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface ToastOptions {
  duration?: number;
  id?: string;
}

class ToastManager {
  private toasts: Map<string, HTMLDivElement> = new Map();
  private container: HTMLDivElement | null = null;

  private getContainer(): HTMLDivElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  private createToast(message: string, type: ToastType, options?: ToastOptions): string {
    const id = options?.id || `toast-${Date.now()}`;
    const container = this.getContainer();

    // Remove existing toast with same id
    if (this.toasts.has(id)) {
      this.removeToast(id);
    }

    const toast = document.createElement('div');
    toast.id = id;
    toast.style.cssText = `
      background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : type === 'loading' ? '#3B82F6' : '#6B7280'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 500;
      pointer-events: auto;
      animation: slideIn 0.3s ease;
      max-width: 400px;
    `;

    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'loading' ? '⟳' : 'ℹ';
    toast.innerHTML = `<span style="font-size: 16px;">${icon}</span><span>${message}</span>`;

    container.appendChild(toast);
    this.toasts.set(id, toast);

    // Auto-remove after duration (except for loading)
    if (type !== 'loading') {
      const duration = options?.duration || 3000;
      setTimeout(() => this.removeToast(id), duration);
    }

    return id;
  }

  private removeToast(id: string): void {
    const toast = this.toasts.get(id);
    if (toast) {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        toast.remove();
        this.toasts.delete(id);
      }, 300);
    }
  }

  success(message: string, options?: ToastOptions): string {
    return this.createToast(message, 'success', options);
  }

  error(message: string, options?: ToastOptions): string {
    return this.createToast(message, 'error', options);
  }

  info(message: string, options?: ToastOptions): string {
    return this.createToast(message, 'info', options);
  }

  loading(message: string, options?: ToastOptions): string {
    return this.createToast(message, 'loading', options);
  }
}

// Add animations to document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

export const toast = new ToastManager();

// Simple function export for compatibility
export function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  if (type === 'success') {
    toast.success(message);
  } else {
    toast.error(message);
  }
}
