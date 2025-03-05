class DucktClient {
  constructor({ proxyId, proxySecret, endpoint = 'https://api.duckt.dev' }) {
    this.proxyId = proxyId;
    this.proxySecret = proxySecret;
    this.endpoint = endpoint;
    this.queue = [];
    this.processing = false;
    this.retryDelay = 1000;
    this.maxRetries = 3;
  }

  async sendRequest(requestData) {
    // Enqueue the request
    this.queue.push({
      data: {
        type: "sdk",
        ...requestData,
        created_at: new Date().toISOString()
      },
      retries: 0
    });

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return true; // Non-blocking
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const item = this.queue.shift();

    try {
      await fetch(`${this.endpoint}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Proxy-ID': this.proxyId,
          'X-Proxy-Secret': this.proxySecret
        },
        body: JSON.stringify(item.data)
      });
    } catch (error) {
      if (item.retries < this.maxRetries) {
        item.retries++;
        // Back off exponentially
        setTimeout(() => {
          this.queue.unshift(item);
        }, this.retryDelay * Math.pow(2, item.retries - 1));
      }
    }

    // Process next item
    setTimeout(() => this.processQueue(), 0);
  }
}

// Usage:
// const client = new DucktClient({ proxyId: 'abc123', proxySecret: 'secret123' });
// client.sendRequest({
//   uri: '/api/users',
//   host: 'example.com',
//   query_params: 'id=123',
//   status_code: 200,
//   request_headers: { 'Content-Type': 'application/json' },
//   response_headers: { 'Content-Type': 'application/json' },
//   method: 'GET',
//   response_time: new Date().toISOString(),
// });
