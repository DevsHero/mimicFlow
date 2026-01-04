/**
 * VS Code API wrapper for webviews
 */

declare global {
    interface Window {
        acquireVsCodeApi: () => VSCodeAPI;
    }
}

interface VSCodeAPI {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
}

class VSCodeAPIWrapper {
    private readonly vscodeApi: VSCodeAPI;

    constructor() {
        this.vscodeApi = window.acquireVsCodeApi();
    }

    public postMessage(message: any): void {
        this.vscodeApi.postMessage(message);
    }

    public getState<T>(): T | undefined {
        return this.vscodeApi.getState();
    }

    public setState<T>(state: T): void {
        this.vscodeApi.setState(state);
    }
}

export const vscodeApi = new VSCodeAPIWrapper();
