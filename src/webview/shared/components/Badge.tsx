import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'danger' | 'warning';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    className = ''
}) => {
    const variantClasses = {
        default: 'bg-gray-600 text-white',
        success: 'bg-green-600 text-white',
        danger: 'bg-red-600 text-white',
        warning: 'bg-yellow-600 text-black'
    };

    return (
        <span
            className={`px-2 py-0.5 text-xs rounded-full font-medium ${variantClasses[variant]} ${className}`}
        >
            {children}
        </span>
    );
};
