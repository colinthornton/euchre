export class Queue<T> {
  private queue: T[] = [];

  get size() {
    return this.queue.length;
  }

  enqueue(item: T) {
    this.queue.push(item);
  }

  dequeue(): T {
    const item = this.queue.shift();
    if (!item) throw new Error();
    return item;
  }
}
