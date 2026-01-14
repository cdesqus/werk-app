import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="saas-card w-full max-w-md p-6 relative border border-border shadow-2xl scale-100 animate-in zoom-in-95 duration-200 bg-card text-card-foreground">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                    <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center mb-4",
                        isDanger ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-500" : "bg-primary/10 text-primary")}>
                        <AlertTriangle size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
                    <p className="text-muted-foreground text-sm">{message}</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-background border border-input hover:bg-muted text-foreground rounded-lg font-bold transition-colors text-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={clsx("flex-1 py-2.5 rounded-lg font-bold transition-colors text-sm shadow-lg",
                            isDanger
                                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
                                : "btn-primary"
                        )}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
