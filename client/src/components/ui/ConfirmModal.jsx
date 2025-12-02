import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="glass-card w-full max-w-md p-6 relative border border-zinc-800 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <h2 className="text-xl font-black text-white mb-2">{title}</h2>
                    <p className="text-zinc-400 text-sm">{message}</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-3 rounded-xl font-bold transition-colors ${isDanger ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-lime-400 hover:bg-lime-300 text-black'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
