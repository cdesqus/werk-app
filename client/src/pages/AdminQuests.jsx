import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Zap, Search, Plus, Trash2, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

const AdminQuests = () => {
    const [quests, setQuests] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: '', reward: '', difficulty: 'Medium' });

    useEffect(() => {
        fetchQuests();
    }, []);

    const fetchQuests = async () => {
        try {
            const { data } = await api.get('/quests');
            setQuests(data);
        } catch (error) {
            console.error("Failed to fetch quests", error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/quests', form);
            fetchQuests();
            setShowModal(false);
            setForm({ title: '', reward: '', difficulty: 'Medium' });
        } catch (error) {
            alert('Failed to create quest');
        }
    };

    const handleComplete = async (id) => {
        try {
            await api.put(`/quests/${id}/complete`);
            fetchQuests();
        } catch (error) {
            alert('Action failed');
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1">Side Quests</h1>
                    <p className="text-zinc-400 text-sm">Create bounties and extra tasks for the team.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={20} /> New Quest
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quests.map(quest => (
                    <div key={quest.id} className="glass-card p-6 flex flex-col justify-between h-full group hover:border-lime-400/30 transition-all relative overflow-hidden">
                        {quest.status === 'Completed' && (
                            <div className="absolute top-0 right-0 bg-lime-400/20 text-lime-400 px-3 py-1 text-xs font-bold uppercase rounded-bl-xl">
                                Completed
                            </div>
                        )}

                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className={clsx("px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border",
                                    quest.difficulty === 'Easy' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                        quest.difficulty === 'Medium' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                            "bg-red-500/10 text-red-400 border-red-500/20"
                                )}>
                                    {quest.difficulty}
                                </span>
                                <span className="text-lime-400 font-black text-lg">{quest.reward}</span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">{quest.title}</h3>

                            {quest.assignedTo ? (
                                <div className="flex items-center gap-2 mt-4 p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                                        {quest.User?.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-500 uppercase font-bold">Assigned To</p>
                                        <p className="text-sm font-bold text-white">{quest.User?.name}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 p-3 bg-zinc-900/50 rounded-xl border border-white/5 border-dashed text-center">
                                    <p className="text-zinc-500 text-sm italic">Open for grabs</p>
                                </div>
                            )}
                        </div>

                        {quest.status === 'Assigned' && (
                            <button onClick={() => handleComplete(quest.id)} className="mt-4 w-full py-2 bg-lime-400/10 text-lime-400 font-bold rounded-xl hover:bg-lime-400 hover:text-black transition-all flex items-center justify-center gap-2">
                                <CheckCircle size={16} /> Mark Complete
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card w-full max-w-md p-8 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-black text-white mb-6">Create New Quest</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Title</label>
                                <input type="text" required className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Reward</label>
                                <input type="text" required className="input-field" placeholder="e.g. 50k or Pizza" value={form.reward} onChange={e => setForm({ ...form, reward: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Difficulty</label>
                                <select className="input-field" value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 font-bold text-zinc-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminQuests;
