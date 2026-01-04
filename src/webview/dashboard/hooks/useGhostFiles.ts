import { useEffect, useState } from 'react';
import { vscodeApi } from '@webview/shared/utils/vscodeApi';
import { GhostFileMetadata } from '@shared/types/GhostFile';

export const useGhostFiles = () => {
    const [ghostFiles, setGhostFiles] = useState<GhostFileMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [miningStatus, setMiningStatus] = useState<string | null>(null);
    const [currentBranch, setCurrentBranch] = useState<string>('unknown');

    useEffect(() => {
        vscodeApi.postMessage({ type: 'webviewReady' });
        vscodeApi.postMessage({ type: 'getGhostFiles' });
        vscodeApi.postMessage({ type: 'getBranch' });

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (!message || typeof message !== 'object') return;

            if (message.type === 'ghostFilesData') {
                setGhostFiles(message.data);
                setLoading(false);
            } else if (message.type === 'miningStatus') {
                setMiningStatus(message.status);
            } else if (message.type === 'miningComplete') {
                setMiningStatus(null);
                vscodeApi.postMessage({ type: 'getGhostFiles' });
            } else if (message.type === 'UPDATE_BRANCH') {
                setCurrentBranch(message.branch || 'unknown');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    return {
        ghostFiles,
        setGhostFiles,
        loading,
        miningStatus,
        currentBranch
    };
};
