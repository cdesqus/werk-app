import clsx from 'clsx';

const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={clsx("animate-pulse rounded-md bg-slate-200 dark:bg-slate-800", className)}
            {...props}
        />
    );
};

export { Skeleton };
