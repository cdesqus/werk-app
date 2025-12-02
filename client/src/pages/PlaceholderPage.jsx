import { Construction } from 'lucide-react';

const PlaceholderPage = ({ title }) => {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
            <div className="p-6 bg-zinc-900 rounded-full border border-zinc-800">
                <Construction size={48} className="text-lime-400" />
            </div>
            <h1 className="text-3xl font-black text-white">{title}</h1>
            <p className="text-zinc-500 max-w-md">
                This module is currently under construction.
                The "WERK IDE" team is working hard to bring this feature to life.
            </p>
        </div>
    );
};

export default PlaceholderPage;
