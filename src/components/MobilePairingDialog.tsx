import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import type { MobilePairingServerStatus } from '../../shared/domain/mobilePairing';

interface MobilePairingDialogProps {
  open: boolean;
  onClose: () => void;
}

const initialStatus: MobilePairingServerStatus = { state: 'stopped' };

export const MobilePairingDialog = ({ open, onClose }: MobilePairingDialogProps) => {
  const [status, setStatus] = useState<MobilePairingServerStatus>(initialStatus);
  const [qrDataUrl, setQrDataUrl] = useState<string>();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!open) return;

    void window.stackpilot.mobilePairing.getStatus().then(setStatus);
    const unsubscribe = window.stackpilot.mobilePairing.subscribe(setStatus);
    return unsubscribe;
  }, [open]);

  useEffect(() => {
    if (!open || status.state !== 'running') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open, status.state]);

  useEffect(() => {
    let cancelled = false;
    if (!status.pairingUri) {
      setQrDataUrl(undefined);
      return;
    }

    void QRCode.toDataURL(status.pairingUri, {
      width: 260,
      margin: 1,
      errorCorrectionLevel: 'M'
    }).then((dataUrl) => {
      if (!cancelled) setQrDataUrl(dataUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [status.pairingUri]);

  const remainingSeconds = useMemo(() => {
    if (!status.expiresAt) return 0;
    return Math.max(0, Math.ceil((status.expiresAt - now) / 1000));
  }, [now, status.expiresAt]);

  if (!open) return null;

  const isRunning = status.state === 'running';
  const isBusy = status.state === 'starting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-pairing-title"
        className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="mobile-pairing-title" className="text-lg font-semibold text-slate-100">
              iPhone・iPadを接続
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              同じLANに接続した端末から、現在のWorkspaceのInspectorログを読み取れます。
            </p>
          </div>
          <button type="button" className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800" onClick={onClose}>
            閉じる
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {status.state === 'error' ? (
            <div className="rounded-lg border border-rose-700/60 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
              {status.errorMessage ?? 'Mobile接続を開始できませんでした。'}
            </div>
          ) : null}

          {isRunning ? (
            <div className="grid gap-4 sm:grid-cols-[280px_1fr] sm:items-center">
              <div className="flex min-h-[280px] items-center justify-center rounded-xl bg-white p-2">
                {qrDataUrl ? <img src={qrDataUrl} alt="Stackpilot Mobile接続用QRコード" className="h-[260px] w-[260px]" /> : null}
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">接続先</div>
                  <div className="mt-1 break-all font-mono text-slate-200">{status.baseUrl}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">残り時間</div>
                  <div className="mt-1 text-slate-200">{remainingSeconds} 秒</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">最終アクセス</div>
                  <div className="mt-1 text-slate-200">
                    {status.lastAccessAt ? new Date(status.lastAccessAt).toLocaleTimeString('ja-JP') : '未接続'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
              接続サーバーは停止しています。必要なときだけ開始してください。
            </div>
          )}

          <div className="rounded-lg bg-slate-950/70 px-3 py-3 text-xs leading-5 text-slate-400">
            QRコードには短命トークンが含まれます。共有・撮影・チャットへの貼り付けは避けてください。サーバーは10分後、または停止操作・アプリ終了時に無効化されます。
          </div>

          <div className="flex justify-end gap-2">
            {isRunning ? (
              <button
                type="button"
                className="rounded bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
                onClick={() => void window.stackpilot.mobilePairing.stop().then(setStatus)}
              >
                接続を停止
              </button>
            ) : (
              <button
                type="button"
                disabled={isBusy}
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                onClick={() => void window.stackpilot.mobilePairing.start().then(setStatus)}
              >
                {isBusy ? '開始中…' : '接続を開始'}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
