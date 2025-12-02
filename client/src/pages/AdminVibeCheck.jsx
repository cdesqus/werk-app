import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { Sparkles, Plus, Trash2, BarChart2, Megaphone } from 'lucide-react';
import clsx from 'clsx';

const AdminVibeCheck = () => {
    const toast = useToast();
    const [feeds, setFeeds] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ type: 'announcement', title: '', content: '', options: ['', ''] });

    useEffect(() => {
        fetchFeeds();
    }, []);

    const fetchFeeds = async () => {
        try {
            const { data } = await api.get('/vibes');
            setFeeds(data);
        } catch (error) {
            console.error("Failed to fetch feeds", error);
        }
    };

    const handlePost = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form };
            if (payload.type === 'announcement') delete payload.options;
            else payload.options = payload.options.filter(o => o.trim() !== '');

            await api.post('/vibes', payload);
            fetchFeeds();
            setShowModal(false);
            setForm({ type: 'announcement', title: '', content: '', options: ['', ''] });
            toast.success('Vibe posted successfully');
        } catch (err) { toast.error('Failed to post'); }
    };

    const addOption = () => setForm({ ...form, options: [...form.options, ''] });
    const updateOption = (idx, val) => {
        const newOpts = [...form.options];
        newOpts[idx] = val;
        setForm({ ...form, options: newOpts });
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1">Vibe Check</h1>
                    <p className="text-zinc-400 text-sm">Announcements and polls for the culture.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={20} /> Post Vibe
                </button>
            </header>

            <div className="grid gap-6 max-w-3xl mx-auto">
                {feeds.map(feed => (
                    <div key={feed.id} className="glass-card p-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center",
                                feed.type === 'poll' ? "bg-purple-500/10 text-purple-400" : "bg-lime-400/10 text-lime-400"
                            )}>
                                {feed.type === 'poll' ? <BarChart2 size={20} /> : <Megaphone size={20} />}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{feed.title}</h3>
                                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">{feed.type}</p>
                            </div>
                        </div>

                        <p className="text-zinc-300 mb-6 whitespace-pre-wrap">{feed.content}</p>

                        {feed.type === 'poll' && (
                            <div className="space-y-3">
                                {feed.options.map(opt => {
                                    const percentage = feed.totalVotes > 0 ? Math.round((opt.voteCount / feed.totalVotes) * 100) : 0;
                                    return (
                                        <div key={opt.id} className="relative h-10 bg-zinc-900/50 rounded-lg overflow-hidden border border-white/5">
                                            <div className="absolute top-0 left-0 h-full bg-purple-500/20 transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                                            <div className="absolute inset-0 flex justify-between items-center px-4">
                                                <span className="text-sm font-bold text-white z-10">{opt.label}</span>
                                                <span className="text-xs font-bold text-zinc-400 z-10">{percentage}% ({opt.voteCount})</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <p className="text-xs text-center text-zinc-500 mt-2">{feed.totalVotes} total votes</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Post Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card w-full max-w-lg p-8 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-black text-white mb-6">Post Vibe Check</h2>
                        <form onSubmit={handlePost} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <button type="button" onClick={() => setForm({ ...form, type: 'announcement' })}
                                    className={clsx("p-3 rounded-xl font-bold border transition-all", form.type === 'announcement' ? "bg-lime-400 text-black border-lime-400" : "bg-zinc-900 border-zinc-700 text-zinc-400")}>
                                    Announcement
                                </button>
                                <button type="button" onClick={() => setForm({ ...form, type: 'poll' })}
                                    className={clsx("p-3 rounded-xl font-bold border transition-all", form.type === 'poll' ? "bg-purple-500 text-white border-purple-500" : "bg-zinc-900 border-zinc-700 text-zinc-400")}>
                                    Poll
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Title</label>
                                <input type="text" required className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Content</label>
                                <textarea required className="input-field h-24" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
                            </div>

                            {form.type === 'poll' && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Options</label>
                                    {form.options.map((opt, idx) => (
                                        <input key={idx} type="text" placeholder={`Option ${idx + 1}`} className="input-field"
                                            value={opt} onChange={e => updateOption(idx, e.target.value)} />
                                    ))}
                                    <button type="button" onClick={addOption} className="text-sm text-lime-400 font-bold hover:underline">+ Add Option</button>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 font-bold text-zinc-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 btn-primary">Post</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminVibeCheck;
