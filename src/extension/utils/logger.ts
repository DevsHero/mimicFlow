export class Logger {
    private readonly prefix = '[MimicFlow]';

    info(message: string, ...args: any[]): void {
        console.log(`${this.prefix} ${message}`, ...args);
    }

    warn(message: string, ...args: any[]): void {
        console.warn(`${this.prefix} ${message}`, ...args);
    }

    error(message: string, ...args: any[]): void {
        console.error(`${this.prefix} ${message}`, ...args);
    }

    debug(message: string, ...args: any[]): void {
        console.debug(`${this.prefix} ${message}`, ...args);
    }
}

export const logger = new Logger();
