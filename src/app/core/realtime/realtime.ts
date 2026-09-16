import { inject, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../auth/auth-store';
import { API_BASE_URL } from '../http/api-base-url';
import { MailboxEvent, RealtimeConnectionState } from './realtime-models';

const MAX_RECONNECT_DELAY_MS = 15_000;

/**
 * Consumes a mailbox's `GET /mailboxes/:id/events` SSE stream.
 *
 * The API is designed to be read with `fetch()` + a `ReadableStream`, not the
 * native `EventSource` — the access token lives in memory and must be sent as
 * a normal `Authorization: Bearer` header, which `EventSource` cannot set.
 * This service hand-parses the SSE frame format (`id:`/`event:`/`data:`
 * lines separated by a blank line) and reconnects with `Last-Event-ID` so the
 * server can replay anything missed, including after its own 15-minute
 * max-stream-duration cutoff.
 *
 * Only one mailbox is ever subscribed to at a time, matching the app's
 * single open mailbox at a time; calling `connect` again tears down any
 * previous connection first.
 */
@Service()
export class Realtime {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly base = inject(API_BASE_URL);

  readonly connectionState = signal<RealtimeConnectionState>('idle');

  private abortController: AbortController | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private currentMailboxId: string | null = null;
  private lastEventId: string | null = null;
  private reconnectAttempt = 0;
  private listener: ((event: MailboxEvent) => void) | null = null;

  connect(mailboxId: string, onEvent: (event: MailboxEvent) => void): void {
    this.teardown();
    this.currentMailboxId = mailboxId;
    this.listener = onEvent;
    this.reconnectAttempt = 0;
    void this.open(mailboxId);
  }

  disconnect(): void {
    this.teardown();
    this.connectionState.set('idle');
  }

  private teardown(): void {
    this.abortController?.abort();
    this.abortController = null;
    clearTimeout(this.reconnectTimer);
    this.currentMailboxId = null;
    this.lastEventId = null;
    this.listener = null;
  }

  private async open(mailboxId: string): Promise<void> {
    const token = this.authStore.accessToken();
    if (!token) {
      this.connectionState.set('error');
      return;
    }

    const controller = new AbortController();
    this.abortController = controller;
    this.connectionState.set(this.reconnectAttempt === 0 ? 'connecting' : 'reconnecting');

    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (this.lastEventId) {
        headers['Last-Event-ID'] = this.lastEventId;
      }

      const response = await fetch(`${this.base}/mailboxes/${mailboxId}/events`, {
        headers,
        signal: controller.signal,
      });

      if (response.status === 401) {
        const newToken = await this.authStore.refreshAccessToken();
        if (!this.isCurrent(mailboxId)) return;
        if (newToken) {
          this.scheduleReconnect(mailboxId, 0);
        } else {
          this.connectionState.set('error');
          void this.router.navigate(['/login']);
        }
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error(`Realtime request failed with status ${response.status}`);
      }

      this.connectionState.set('open');
      this.reconnectAttempt = 0;
      await this.pump(response.body, mailboxId);

      if (this.isCurrent(mailboxId)) {
        this.scheduleReconnect(mailboxId);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (this.isCurrent(mailboxId)) {
        this.scheduleReconnect(mailboxId);
      }
    }
  }

  private async pump(body: ReadableStream<Uint8Array>, mailboxId: string): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;

      buffer += decoder.decode(value, { stream: true });
      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        this.handleFrame(frame, mailboxId);
      }
    }
  }

  private handleFrame(frame: string, mailboxId: string): void {
    let eventName: string | null = null;
    const dataLines: string[] = [];

    for (const line of frame.split('\n')) {
      if (!line || line.startsWith(':')) continue; // heartbeat/comment frame
      const colonIndex = line.indexOf(':');
      const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
      const value = colonIndex === -1 ? '' : line.slice(colonIndex + 1).replace(/^ /, '');

      if (field === 'event') eventName = value;
      else if (field === 'id') this.lastEventId = value;
      else if (field === 'data') dataLines.push(value);
    }

    if (!eventName || eventName === 'ready' || dataLines.length === 0 || !this.isCurrent(mailboxId)) {
      return;
    }

    try {
      this.listener?.(JSON.parse(dataLines.join('\n')) as MailboxEvent);
    } catch {
      // Malformed frame — ignore rather than crash the stream.
    }
  }

  private scheduleReconnect(mailboxId: string, delayMs?: number): void {
    this.connectionState.set('reconnecting');
    const delay = delayMs ?? Math.min(1000 * 2 ** this.reconnectAttempt, MAX_RECONNECT_DELAY_MS);
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => void this.open(mailboxId), delay);
  }

  private isCurrent(mailboxId: string): boolean {
    return this.currentMailboxId === mailboxId;
  }
}
