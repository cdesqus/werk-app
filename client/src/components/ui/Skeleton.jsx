import clsx from 'clsx';

const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={clsx("animate-pulse rounded-md bg-white/5", className)}
            {...props}
        />
    );
};

export { Skeleton };
