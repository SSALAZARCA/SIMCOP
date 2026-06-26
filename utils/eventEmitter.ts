// Local Event Emitter
class EventEmitter {
  private events: Record<string, Array<{ token: string; callback: (...args: any[]) => void }>> = {};

  subscribe(event: string, callback: (...args: any[]) => void): string {
    if (!this.events[event]) this.events[event] = [];
    const token = Math.random().toString(36).substring(2);
    this.events[event].push({ token, callback });
    return token;
  }

  unsubscribe(token: string): void {
    for (const eventKey in this.events) {
      if (Object.prototype.hasOwnProperty(eventKey)) {
        this.events[eventKey] = this.events[eventKey].filter(sub => sub.token !== token);
      }
    }
  }

  publish(event: string, data?: any): void {
    if (!this.events[event]) return;
    this.events[event].forEach(sub => {
      try {
        sub.callback(event, data);
      } catch (e) {
        console.error(`Error in event bus callback for event "${event}": ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }
}

export const eventBus = new EventEmitter();
