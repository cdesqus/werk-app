import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { X } from 'lucide-react';
import api from '../utils/api';

const BirthdayBanner = () => {
    const [birthdays, setBirthdays] = useState([]);
    const [show, setShow] = useState(true);
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        const fetchBirthdays = async () => {
            try {
                const { data } = await api.get('/birthdays/today');
                if (data.length > 0) {
                    setBirthdays(data);
                }
            } catch (err) {
                console.error("Failed to fetch birthdays", err);
            }
        };
        fetchBirthdays();

        const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (birthdays.length === 0 || !show) return null;

    return (
        <>
            <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} />
            <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-lime-500 text-white p-3 relative z-50 shadow-lg animate-in slide-in-from-top duration-500">
                <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
                    <div className="flex items-center gap-2 font-black tracking-wide text-sm md:text-base">
                        <span className="text-2xl animate-bounce">🎂</span>
                        <span>HBD BESTIE! Happy Level Up to <span className="underline decoration-wavy decoration-white/50">{birthdays.join(', ')}</span>! 🎉</span>
                    </div>
                    <button onClick={() => setShow(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>
        </>
    );
};

export default BirthdayBanner;
