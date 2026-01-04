import React from 'react';

interface AvatarProps {
    name: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
    name,
    size = 'md',
    className = ''
}) => {
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const sizeClasses = {
        xs: 'w-5 h-5 text-[10px]',
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-10 h-10 text-base'
    };

    return (
        <div
            className={`${sizeClasses[size]} rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold ${className}`}
            title={name}
        >
            {initials}
        </div>
    );
};
