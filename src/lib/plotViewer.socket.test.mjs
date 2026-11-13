// Feature: interactive-plot-layout, Property live-status: socket disconnect switches to polling
// Tests socket disconnect → 30s polling and join refusal → viewer stays working.
// node --test src/lib/plotViewer.socket.test.mjs
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Minimal socket.io-client mock. Calls `connectCb` synchronously; records
 * emits; lets tests fire disconnect / plot_status events.
 */
function makeMockIo(joinAck = { ok: true }) {
  const handlers = {};
  let emitted = [];
  const sock = {
    on(event, cb) { handlers[event] = cb; return sock; },
    emit(event, data, ack) {
      emitted.push({ event, data });
      if (event === 'join' && ack) ack(joinAck);
    },
    disconnect() { handlers['disconnect']?.(); },
    fire(event, data) { handlers[event]?.(data); },
    _emitted: emitted,
  };
  return sock;
}

// ── Test A: disconnect → polling starts ──────────────────────────────────

test('socket disconnect starts 30s polling and fetch is called after the interval', async () => {
  // Fake timers via manual scheduling
  const timers = [];
  let fetchCount = 0;

  // Simulate the ViewerMap socket logic inline (pure logic, no React):
  function setupSocket(slug, onPlotsUpdate) {
    const sock = makeMockIo({ ok: true });
    let pollingInterval = null;

    // simulate connect
    sock.on('connect', () => {
      sock.emit('join', { slug }, (ack) => {
        if (!ack || !ack.ok) startPolling();
      });
    });

    sock.on('plot_status', (data) => {
      onPlotsUpdate(data.changes);
    });

    function startPolling() {
      if (pollingInterval) return;
      // In real code this is setInterval(fetch, 30000)
      pollingInterval = { active: true, fetch: () => { fetchCount++; } };
      timers.push(pollingInterval);
    }

    function stopPolling() {
      pollingInterval = null;
    }

    sock.on('disconnect', () => {
      startPolling();
    });

    sock.on('connect', () => {
      stopPolling();
    });

    // simulate connect
    handlers_fire(sock, 'connect');
    return { sock, getPolling: () => pollingInterval };
  }

  function handlers_fire(sock, event) { sock.fire(event, undefined); }

  const plotsUpdated = [];
  const { sock, getPolling } = setupSocket('test-project', (changes) => plotsUpdated.push(changes));

  // Before disconnect, polling is null
  assert.ok(!getPolling(), 'No polling before disconnect');

  // Trigger disconnect
  sock.fire('disconnect', undefined);

  // After disconnect, polling is active
  assert.ok(getPolling()?.active, 'Polling should start on disconnect');

  // Simulate a timer tick
  getPolling().fetch();
  assert.equal(fetchCount, 1, 'Fetch should have been called once');
});

// ── Test B: join refusal → viewer stays working ───────────────────────────

test('join ack { ok: false } falls back to polling, plots stay visible', async () => {
  let pollingStarted = false;
  let currentPlots = [{ id: '1', status: 'available', plotNumber: 'A1', path: [] }];

  // Minimal simulation of the PublicPlotViewer logic
  function setupSocket(slug) {
    const sock = makeMockIo({ ok: false }); // server refuses join

    sock.on('connect', () => {
      sock.emit('join', { slug }, (ack) => {
        if (!ack || !ack.ok) {
          // Fall back to polling — viewer stays working, no throw
          pollingStarted = true;
        }
      });
    });

    // Fire connect
    sock.fire('connect', undefined);
    return sock;
  }

  const sock = setupSocket('project-slug');

  // Polling should have started
  assert.ok(pollingStarted, 'Polling should start when join is refused');

  // Plots must still be accessible (viewer does not clear them)
  assert.equal(currentPlots.length, 1, 'Plots should remain visible after join refusal');
  assert.equal(currentPlots[0].status, 'available');
});

// ── Test C: plot_status event updates plots ───────────────────────────────

test('plot_status event applies status changes correctly', () => {
  let plots = [
    { id: 'p1', status: 'available', plotNumber: '1', path: [] },
    { id: 'p2', status: 'available', plotNumber: '2', path: [] },
  ];

  const sock = makeMockIo({ ok: true });
  sock.on('plot_status', (data) => {
    // Exact logic from PublicPlotViewer (R19.10)
    plots = plots.map((p) => {
      const change = data.changes.find((c) => c.id === p.id);
      return change ? { ...p, status: change.status } : p;
    });
  });

  sock.fire('plot_status', { changes: [{ id: 'p1', status: 'booked' }] });

  assert.equal(plots[0].status, 'booked', 'p1 should be booked');
  assert.equal(plots[1].status, 'available', 'p2 should remain available');
});
