import { afterEach, describe, expect, it } from 'vitest';
import type { ApiLogEntry, AppSnapshot } from '../../shared/contracts';
import { parseMobilePairingUri } from '../../shared/domain/mobilePairing';
import { MobileInspectorServer } from '../../electron/main/services/mobileInspectorServer';

const workspace = {
  id: 'workspace-1',
  name: 'Development',
  environmentType: 'dev' as const,
  prodDomains: [],
  partitionKey: 'persist:workspace-1',
  tabs: [
    {
      id: 'tab-1',
      title: 'Example',
      url: 'https://example.com',
      isActive: true,
      workspaceId: 'workspace-1'
    }
  ],
  createdAt: '2026-07-22T00:00:00.000Z',
  updatedAt: '2026-07-22T00:00:00.000Z'
};

const log: ApiLogEntry = {
  id: 'log-1',
  workspaceId: workspace.id,
  tabId: 'tab-1',
  type: 'xhr',
  method: 'GET',
  url: 'https://example.com/api/users',
  status: 200,
  durationMs: 42,
  requestHeaders: { accept: 'application/json' },
  responseHeaders: { 'content-type': 'application/json' },
  responseBodySnippet: '{"ok":true}',
  startedAt: 1,
  finishedAt: 43
};

const snapshot: AppSnapshot = {
  version: 2,
  activeWorkspaceId: workspace.id,
  activeTabId: 'tab-1',
  workspaces: [workspace]
};

const runningServers: MobileInspectorServer[] = [];

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => server.stop()));
});

describe('MobileInspectorServer', () => {
  it('Bearer token必須でactive Workspaceのsnapshotを返す', async () => {
    const server = new MobileInspectorServer({
      getSnapshot: () => snapshot,
      listLogs: () => [log],
      resolveLanAddress: () => '192.168.1.20',
      tokenFactory: () => 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
      ttlMs: 60_000
    });
    runningServers.push(server);

    const status = await server.start();
    expect(status.state).toBe('running');
    const pairing = parseMobilePairingUri(status.pairingUri!);
    const localBaseUrl = pairing.baseUrl.replace('192.168.1.20', '127.0.0.1');

    const unauthorized = await fetch(`${localBaseUrl}/v1/mobile/inspector/snapshot`);
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get('cache-control')).toBe('no-store');

    const response = await fetch(`${localBaseUrl}/v1/mobile/inspector/snapshot`, {
      headers: { authorization: `Bearer ${pairing.token}` }
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      workspace: { id: workspace.id, name: workspace.name, environmentType: 'dev' },
      logs: [{ id: log.id, url: log.url }]
    });
    expect(server.getStatus().lastAccessAt).toBeTypeOf('number');
  });

  it('期限切れtokenを拒否する', async () => {
    let now = 1_000;
    const server = new MobileInspectorServer({
      getSnapshot: () => snapshot,
      listLogs: () => [log],
      resolveLanAddress: () => '192.168.1.20',
      tokenFactory: () => 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
      now: () => now,
      ttlMs: 1_000
    });
    runningServers.push(server);

    const status = await server.start();
    const pairing = parseMobilePairingUri(status.pairingUri!);
    const localBaseUrl = pairing.baseUrl.replace('192.168.1.20', '127.0.0.1');
    now = pairing.expiresAt;

    const response = await fetch(`${localBaseUrl}/v1/mobile/inspector/snapshot`, {
      headers: { authorization: `Bearer ${pairing.token}` }
    });
    expect(response.status).toBe(401);
  });

  it('LANアドレスがない場合は起動しない', async () => {
    const server = new MobileInspectorServer({
      getSnapshot: () => snapshot,
      listLogs: () => [],
      resolveLanAddress: () => undefined
    });
    runningServers.push(server);

    await expect(server.start()).resolves.toMatchObject({
      state: 'error'
    });
  });
});
