import React from 'react';

interface GroupHeaderProps {
    label: string;
    count: number;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({ label, count }) => {
    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-700">
            <h2 className="text-sm font-semibold uppercase opacity-70">
                {label} <span className="text-xs opacity-50">{count} {count === 1 ? 'change' : 'changes'}</span>
            </h2>
        </div>
    );
};
