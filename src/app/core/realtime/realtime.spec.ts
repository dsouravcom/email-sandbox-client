import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { API_BASE_URL } from '../http/api-base-url';
import { AuthStore } from '../auth/auth-store';
import { Realtime } from './realtime';
import { MailboxEvent } from './realtime-models';

/** Builds a `Response`-like object whose `body` streams the given SSE text in one chunk. */
function sseResponse(text: string, status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
  return { status, ok: status >= 200 && status < 300, body: stream } as Response;
}

describe('Realtime', () => {
  let realtime: Realtime;
  const refreshAccessToken = vi.fn<() => Promise<string | null>>();

  beforeEach(() => {
    refreshAccessToken.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '/api' },
        { provide: AuthStore, useValue: { accessToken: signal('token-1').asReadonly(), refreshAccessToken } },
      ],
    });
    realtime = TestBed.inject(Realtime);
  });

  afterEach(() => {
    realtime.disconnect();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('parses a live event frame and delivers it to the listener', async () => {
    const frame = 'event: email.read\nid: email-1\ndata: {"type":"email.read","mailboxId":"m1","organizationId":"o1","emailId":"email-1","readAt":"2024-01-01T00:00:00.000Z"}\n\n';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(frame)));

    const received: MailboxEvent[] = [];
    realtime.connect('m1', (event) => received.push(event));

    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(received[0]).toMatchObject({ type: 'email.read', emailId: 'email-1' });
  });

  it('ignores heartbeat comments and the synthetic "ready" frame', async () => {
    const frame = ': heartbeat\n\nevent: ready\ndata: {"mailboxId":"m1"}\n\n';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(frame)));

    const received: MailboxEvent[] = [];
    realtime.connect('m1', (event) => received.push(event));

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(received).toHaveLength(0);
  });

  it('sends Last-Event-ID on the reconnect that follows a stream ending', async () => {
    vi.useFakeTimers();
    const frame = 'event: email.deleted\nid: email-9\ndata: {"type":"email.deleted","mailboxId":"m1","organizationId":"o1","emailId":"email-9"}\n\n';
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(frame));
    vi.stubGlobal('fetch', fetchMock);

    realtime.connect('m1', () => {});
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(1100); // first reconnect backoff is 1000ms

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const secondCallHeaders = fetchMock.mock.calls[1][1].headers as Record<string, string>;
    expect(secondCallHeaders['Last-Event-ID']).toBe('email-9');
  });

  it('refreshes the token and reconnects immediately on a 401', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(sseResponse('', 401))
      .mockResolvedValueOnce(sseResponse('event: mailbox.updated\ndata: {"type":"mailbox.updated","mailboxId":"m1","organizationId":"o1"}\n\n'));
    vi.stubGlobal('fetch', fetchMock);
    refreshAccessToken.mockResolvedValue('token-2');

    const received: MailboxEvent[] = [];
    realtime.connect('m1', (event) => received.push(event));

    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sends the user to the login page when a 401 cannot be refreshed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse('', 401)));
    refreshAccessToken.mockResolvedValue(null);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    realtime.connect('m1', () => {});

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/login']));
    expect(realtime.connectionState()).toBe('error');
  });

  it('stops delivering events from a superseded connection after connecting to a different mailbox', async () => {
    const first = new ReadableStream<Uint8Array>({ start() {} }); // never resolves/closes
    const fetchMock = vi.fn().mockResolvedValueOnce({ status: 200, ok: true, body: first } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const received: MailboxEvent[] = [];
    realtime.connect('m1', (event) => received.push(event));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fetchMock.mockResolvedValueOnce(
      sseResponse('event: mailbox.deleted\ndata: {"type":"mailbox.deleted","mailboxId":"m2","organizationId":"o1"}\n\n'),
    );
    realtime.connect('m2', (event) => received.push(event));

    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(received[0]).toMatchObject({ mailboxId: 'm2' });
  });
});
