'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Toast Types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast Icons and Colors
const TOAST_CONFIG: Record<ToastType, { icon: string; bg: string; border: string; title: string }> = {
    success: {
        icon: '✅',
        bg: 'bg-green-50',
        border: 'border-green-200',
        title: 'text-green-800',
    },
    error: {
        icon: '❌',
        bg: 'bg-red-50',
        border: 'border-red-200',
        title: 'text-red-800',
    },
    warning: {
        icon: '⚠️',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        title: 'text-amber-800',
    },
    info: {
        icon: 'ℹ️',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        title: 'text-blue-800',
    },
};

// Provider Component
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast = { ...toast, id };

        setToasts(prev => [...prev, newToast]);

        // Auto-remove after duration
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    const success = useCallback((title: string, message?: string) => {
        addToast({ type: 'success', title, message });
    }, [addToast]);

    const error = useCallback((title: string, message?: string) => {
        addToast({ type: 'error', title, message, duration: 8000 });
    }, [addToast]);

    const warning = useCallback((title: string, message?: string) => {
        addToast({ type: 'warning', title, message });
    }, [addToast]);

    const info = useCallback((title: string, message?: string) => {
        addToast({ type: 'info', title, message });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </ToastContext.Provider>
    );
}

// Hook
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Toast Container
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
}

// Individual Toast
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    const config = TOAST_CONFIG[toast.type];

    return (
        <div
            className={`
                ${config.bg} ${config.border} border rounded-xl p-4 shadow-lg
                animate-in slide-in-from-right-5 fade-in duration-300
                flex items-start gap-3 min-w-[280px]
            `}
            role="alert"
        >
            <span className="text-xl flex-shrink-0">{config.icon}</span>
            <div className="flex-1 min-w-0">
                <p className={`font-medium ${config.title}`}>{toast.title}</p>
                {toast.message && (
                    <p className="text-sm text-gray-600 mt-0.5">{toast.message}</p>
                )}
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                aria-label="Dismiss"
            >
                ✕
            </button>
        </div>
    );
}

// Standalone toast function for non-React contexts (optional)
let toastRef: ToastContextType | null = null;

export function setToastRef(ref: ToastContextType) {
    toastRef = ref;
}

export const toast = {
    success: (title: string, message?: string) => toastRef?.success(title, message),
    error: (title: string, message?: string) => toastRef?.error(title, message),
    warning: (title: string, message?: string) => toastRef?.warning(title, message),
    info: (title: string, message?: string) => toastRef?.info(title, message),
};
