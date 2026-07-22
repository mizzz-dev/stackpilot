import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MobileInspectorSnapshot } from '@stackpilot/shared/domain/mobile-inspector';
import {
  isMobilePairingExpired,
  parseMobilePairingUri,
  type MobilePairingConnection
} from '@stackpilot/shared/domain/mobile-pairing';
import {
  createInspectorRepository,
  type InspectorConnectionMode,
  type InspectorRepository
} from '@/repositories/inspector-repository';
import {
  clearPairingConnection,
  loadPairingConnection,
  savePairingConnection
} from '@/data/pairing-storage';

export type InspectorLoadStatus = 'loading' | 'ready' | 'error';

export interface InspectorSnapshotState {
  snapshot?: MobileInspectorSnapshot;
  status: InspectorLoadStatus;
  connectionMode: InspectorConnectionMode;
  errorMessage?: string;
  hasPairing: boolean;
  reload: () => Promise<void>;
  pair: (pairingUri: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useInspectorSnapshot = (): InspectorSnapshotState => {
  const [pairingConnection, setPairingConnection] = useState<MobilePairingConnection>();
  const [isInitialized, setIsInitialized] = useState(false);
  const repository = useMemo(() => createInspectorRepository(pairingConnection), [pairingConnection]);
  const [snapshot, setSnapshot] = useState<MobileInspectorSnapshot>();
  const [status, setStatus] = useState<InspectorLoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadFrom = useCallback(async (target: InspectorRepository) => {
    setStatus('loading');
    setErrorMessage(undefined);

    try {
      const nextSnapshot = await target.loadSnapshot();
      setSnapshot(nextSnapshot);
      setStatus('ready');
    } catch (error) {
      setSnapshot(undefined);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Inspectorデータの取得に失敗しました。');
      throw error;
    }
  }, []);

  const reload = useCallback(async () => {
    await loadFrom(repository);
  }, [loadFrom, repository]);

  const pair = useCallback(async (pairingUri: string) => {
    const connection = parseMobilePairingUri(pairingUri);
    if (isMobilePairingExpired(connection)) {
      throw new Error('QRコードの有効期限が切れています。Desktopで再発行してください。');
    }

    const pairedRepository = createInspectorRepository(connection);
    await loadFrom(pairedRepository);
    await savePairingConnection(connection);
    setPairingConnection(connection);
  }, [loadFrom]);

  const disconnect = useCallback(async () => {
    await clearPairingConnection();
    setPairingConnection(undefined);
    await loadFrom(createInspectorRepository());
  }, [loadFrom]);

  useEffect(() => {
    let cancelled = false;
    void loadPairingConnection().then((connection) => {
      if (!cancelled) {
        setPairingConnection(connection);
        setIsInitialized(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    void reload().catch(() => undefined);
  }, [isInitialized, reload]);

  return {
    snapshot,
    status,
    connectionMode: repository.mode,
    errorMessage,
    hasPairing: Boolean(pairingConnection),
    reload,
    pair,
    disconnect
  };
};
