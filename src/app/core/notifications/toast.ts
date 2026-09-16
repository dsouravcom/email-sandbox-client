import { Service, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  variant: ToastVariant;
  text: string;
}

const DEFAULT_DURATION_MS = 4000;
const ERROR_DURATION_MS = 6000;

/**
 * A small queue of transient notifications. Reserved for events worth
 * interrupting the user for (a mailbox created, a destructive action
 * confirmed, an unexpected failure) — not every minor interaction.
 */
@Service()
export class Toast {
  private readonly _messages = signal<ToastMessage[]>([]);
  readonly messages = this._messages.asReadonly();

  private nextId = 0;

  success(text: string): void {
    this.show(text, 'success', DEFAULT_DURATION_MS);
  }

  error(text: string): void {
    this.show(text, 'error', ERROR_DURATION_MS);
  }

  info(text: string): void {
    this.show(text, 'info', DEFAULT_DURATION_MS);
  }

  dismiss(id: number): void {
    this._messages.update((messages) => messages.filter((message) => message.id !== id));
  }

  private show(text: string, variant: ToastVariant, durationMs: number): void {
    const id = this.nextId++;
    this._messages.update((messages) => [...messages, { id, variant, text }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }
}
