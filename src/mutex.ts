export class Mutex {
    private locked: boolean = false;
    private queue: Array<() => void> = [];

    lock() {
        return new Promise<void>((resolve) => {
            if (!this.locked) {
                this.locked = true;
                resolve();
            } else {
                this.queue.push(resolve);
            }
        });
    }

    unlock() {
        if (this.queue.length > 0) {
            const nextResolve = this.queue.shift();
            if (nextResolve) nextResolve();
            else this.unlock();
        } else {
            this.locked = false;
        }
    }
}
