import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { MapPin, Navigation, Clock, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const Presence = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [lastLog, setLastLog] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial Fetch: Get Last Log to determine state (In or Out)
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                // Fetch valid logs for this user
                const { data } = await api.get(`/attendance?userId=${user.id}`);
                if (data && data.length > 0) {
                    setLastLog(data[0]); // Most recent is first
                }
            } catch (err) {
                console.error("Failed to fetch history", err);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchHistory();
    }, [user]);

    // Live Geolocation Watch
    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                setError(null);
            },
            (err) => {
                setError('Unable to retrieve location. Please enable GPS.');
                console.error(err);
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const handleAttendance = async () => {
        if (!location) {
            toast.error('Waiting for GPS signal...');
            return;
        }

        setIsSubmitting(true);
        try {
            // Determine type based on last log
            // If no log, default to CLOCK_IN. If last was CLOCK_IN, next is CLOCK_OUT.
            const type = lastLog?.type === 'CLOCK_IN' ? 'CLOCK_OUT' : 'CLOCK_IN';

            const { data } = await api.post('/attendance', {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                type
            });

            if (data.is_suspicious) {
                toast.error('Suspicious activity detected! This log has been flagged.');
            } else {
                toast.success(`Successfully ${type === 'CLOCK_IN' ? 'Clocked In' : 'Clocked Out'}!`);
            }

            setLastLog(data);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit attendance');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) return null;

    // determine next action
    const nextAction = lastLog?.type === 'CLOCK_IN' ? 'CLOCK_OUT' : 'CLOCK_IN';

    return (
        <div className="max-w-md mx-auto space-y-6 pb-20">
            <header>
                <h1 className="text-3xl font-black text-foreground flex items-center gap-2">
                    <MapPin className="text-red-500" /> Presence
                </h1>
                <p className="text-muted-foreground font-medium">Geolocation Attendance</p>
            </header>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-3">
                    <AlertTriangle size={20} className="shrink-0" />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            {/* Map Preview Card */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl aspect-video relative group">
                {location ? (
                    <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        marginHeight="0"
                        marginWidth="0"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.002}%2C${location.latitude - 0.002}%2C${location.longitude + 0.002}%2C${location.latitude + 0.002}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`}
                        className="grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                    ></iframe>
                ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center animate-pulse">
                        <MapPin className="text-muted-foreground opacity-20" size={48} />
                    </div>
                )}

                {/* Overlay Info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                    <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-2">
                            <Navigation size={14} className="text-lime-400" />
                            <span className="text-xs font-mono">
                                {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Locating...'}
                            </span>
                        </div>
                        {location && (
                            <span className="text-[10px] bg-white/20 backdrop-blur px-2 py-0.5 rounded text-white/80">
                                ± {Math.round(location.accuracy)}m
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Action Button */}
            <div className="flex justify-center py-8">
                <button
                    onClick={handleAttendance}
                    disabled={!location || isSubmitting || !!error}
                    className={clsx(
                        "relative w-48 h-48 rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-300 shadow-2xl",
                        !location ? "bg-zinc-200 dark:bg-zinc-800 cursor-not-allowed opacity-50" :
                            nextAction === 'CLOCK_IN'
                                ? "bg-emerald-500 hover:bg-emerald-400 hover:scale-105 shadow-emerald-500/40"
                                : "bg-red-500 hover:bg-red-400 hover:scale-105 shadow-red-500/40"
                    )}
                >
                    {/* Ring Pulse Animation */}
                    {location && !isSubmitting && (
                        <div className={clsx("absolute inset-0 rounded-full animate-ping opacity-20",
                            nextAction === 'CLOCK_IN' ? 'bg-emerald-500' : 'bg-red-500'
                        )} />
                    )}

                    <MapPin size={40} className={clsx("text-white drop-shadow-md", isSubmitting && "animate-bounce")} />
                    <span className="text-2xl font-black text-white tracking-widest drop-shadow-sm uppercase">
                        {isSubmitting ? 'Verifying...' : nextAction.replace('_', ' ')}
                    </span>
                </button>
            </div>

            {/* Last Log Status */}
            <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Last Activity</h3>
                    <div className="flex items-center gap-2">
                        {lastLog ? (
                            <>
                                <div className={clsx("w-2 h-2 rounded-full", lastLog.type === 'CLOCK_IN' ? 'bg-emerald-500' : 'bg-red-500')} />
                                <span className="font-bold text-foreground">
                                    {lastLog.type === 'CLOCK_IN' ? 'Clocked In' : 'Clocked Out'}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    at {new Date(lastLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </>
                        ) : (
                            <span className="text-sm text-muted-foreground">No records found today</span>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-xs text-muted-foreground block">Server Time</span>
                    <span className="font-mono text-xs font-bold text-foreground opacity-50">SYNCED</span>
                </div>
            </div>

            <div className="text-center">
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    By using this feature, you agree to share your precise location for attendance verification purposes.
                    <br />Anti-Fake GPS systems are active.
                </p>
            </div>
        </div>
    );
};

export default Presence;
