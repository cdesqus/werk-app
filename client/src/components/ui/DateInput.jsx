import { useRef } from 'react';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import clsx from 'clsx';

const DateInput = ({ value, onChange, required, placeholder, className }) => {
    const dateInputRef = useRef(null);

    const handleDivClick = () => {
        // Try showPicker first (modern browsers)
        if (dateInputRef.current?.showPicker) {
            dateInputRef.current.showPicker();
        } else {
            // Fallback for older browsers: focus might trigger it on mobile
            dateInputRef.current?.focus();
        }
    };

    // Safely format date, handle invalid dates gracefully
    const getDisplayValue = () => {
        if (!value) return '';
        try {
            return format(new Date(value), 'dd/MM/yyyy');
        } catch (e) {
            return value; // Fallback
        }
    };

    const displayValue = getDisplayValue();

    return (
        <div
            className={clsx(
                "relative cursor-pointer group input-field flex items-center justify-between",
                "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20",
                className
            )}
            onClick={handleDivClick}
        >
            <span className={clsx("pointer-events-none select-none truncate font-medium", value ? 'text-foreground' : 'text-muted-foreground')}>
                {displayValue || placeholder || 'dd/mm/yyyy'}
            </span>
            <Calendar size={18} className="text-muted-foreground group-hover:text-primary transition-colors pointer-events-none shrink-0 ml-2" />

            <input
                ref={dateInputRef}
                type="date"
                required={required}
                value={value}
                onChange={onChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full appearance-none"
                // Ensure it covers everything
                style={{ zIndex: 10 }}
            />
        </div>
    );
};

export default DateInput;
