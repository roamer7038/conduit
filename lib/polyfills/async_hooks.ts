export class AsyncLocalStorage<T> {
  private store: T | undefined;

  constructor() {
    this.store = undefined;
  }

  disable(): void {
    this.store = undefined;
  }

  getStore(): T | undefined {
    return this.store;
  }

  run<R>(store: T, callback: (...args: any[]) => R, ...args: any[]): R {
    const oldStore = this.store;
    this.store = store;
    try {
      return callback(...args);
    } finally {
      this.store = oldStore;
    }
  }

  exit<R>(callback: (...args: any[]) => R, ...args: any[]): R {
    const oldStore = this.store;
    this.store = undefined;
    try {
      return callback(...args);
    } finally {
      this.store = oldStore;
    }
  }

  enterWith(store: T): void {
    this.store = store;
  }
}
