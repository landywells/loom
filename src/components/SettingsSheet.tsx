import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../lib/useFocusTrap';
import { verifyLastfm } from '../lib/lastfm';
import type { Prefs } from '../lib/prefs';
import type { SyncTarget } from '../lib/remotes';
import { relativeTime } from '../lib/utils';

interface SettingsSheetProps {
  prefs: Prefs;
  onChange: (next: Prefs) => void;
  onSync: (passphrase: string) => void;
  syncing: boolean;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function SettingsSheet({ prefs, onChange, onSync, syncing, onClose }: SettingsSheetProps) {
  const panelRef = useFocusTrap<HTMLDivElement>();
  const [passphrase, setPassphrase] = useState('');
  const [checking, setChecking] = useState(false);
  const [lastfmNote, setLastfmNote] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const target = prefs.sync?.target ?? { kind: 'off' };

  const setTarget = (next: SyncTarget) =>
    onChange({
      ...prefs,
      // A new target invalidates the key cached against the old one.
      sync: next.kind === 'off' ? null : { target: next, key: undefined, salt: undefined },
    });

  const checkLastfm = async () => {
    if (!prefs.lastfm?.key || !prefs.lastfm?.user) {
      setLastfmNote('Both a key and a username are needed.');
      return;
    }
    setChecking(true);
    try {
      const { playcount } = await verifyLastfm(prefs.lastfm);
      setLastfmNote(`Connected — ${playcount.toLocaleString()} scrobbles on record.`);
    } catch (error) {
      setLastfmNote((error as Error).message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="modal-panel settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">On this device only</span>
            <h2>Settings</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="settings-body">
          <section>
            <h3>Sync</h3>
            <p className="settings-lede">
              Your library leaves this device as ciphertext. The passphrase is never stored or
              sent, so the host of the file cannot read it — and neither can we if you forget it.
            </p>

            <div className="settings-targets" role="radiogroup" aria-label="Sync destination">
              {(
                [
                  { kind: 'off', label: 'Off' },
                  { kind: 'gist', label: 'GitHub gist' },
                  { kind: 'webdav', label: 'WebDAV' },
                ] as const
              ).map((option) => (
                <button
                  key={option.kind}
                  role="radio"
                  aria-checked={target.kind === option.kind}
                  className={target.kind === option.kind ? 'active' : ''}
                  onClick={() => setTarget({ kind: option.kind } as SyncTarget)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {target.kind === 'gist' && (
              <div className="settings-fields">
                <Row label="Fine-grained token, gist scope only">
                  <input
                    type="password"
                    value={target.token}
                    onChange={(event) => setTarget({ ...target, token: event.target.value })}
                    placeholder="github_pat_…"
                    autoComplete="off"
                  />
                </Row>
                {target.gistId && (
                  <p className="settings-note">Synced to gist {target.gistId}.</p>
                )}
              </div>
            )}

            {target.kind === 'webdav' && (
              <div className="settings-fields">
                <Row label="File URL">
                  <input
                    value={target.url}
                    onChange={(event) => setTarget({ ...target, url: event.target.value })}
                    placeholder="https://cloud.example.com/remote.php/dav/files/me/loom.library.json"
                    autoComplete="off"
                  />
                </Row>
                <div className="settings-fields-row">
                  <Row label="User">
                    <input
                      value={target.user}
                      onChange={(event) => setTarget({ ...target, user: event.target.value })}
                      autoComplete="off"
                    />
                  </Row>
                  <Row label="Password">
                    <input
                      type="password"
                      value={target.password}
                      onChange={(event) => setTarget({ ...target, password: event.target.value })}
                      autoComplete="off"
                    />
                  </Row>
                </div>
              </div>
            )}

            {target.kind !== 'off' && (
              <div className="settings-sync">
                <Row label="Passphrase">
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(event) => setPassphrase(event.target.value)}
                    placeholder={prefs.sync?.key ? 'Not needed on this device' : 'Type it once'}
                    autoComplete="off"
                  />
                </Row>
                <div className="settings-row">
                  <span>
                    {prefs.sync?.lastSyncedAt
                      ? `Last synced ${relativeTime(new Date(prefs.sync.lastSyncedAt).toISOString())}`
                      : 'Never synced from here.'}
                  </span>
                  <button
                    className="button-primary"
                    onClick={() => onSync(passphrase)}
                    disabled={syncing}
                  >
                    {syncing ? 'Working…' : 'Sync now'}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section>
            <h3>Listening history</h3>
            <p className="settings-lede">
              Last.fm’s API is free but demands a key of your own. It stays on this device and is
              never included in an export or a sync.
            </p>
            <div className="settings-fields">
              <div className="settings-fields-row">
                <Row label="API key">
                  <input
                    type="password"
                    value={prefs.lastfm?.key ?? ''}
                    onChange={(event) =>
                      onChange({
                        ...prefs,
                        lastfm: { key: event.target.value, user: prefs.lastfm?.user ?? '' },
                      })
                    }
                    autoComplete="off"
                  />
                </Row>
                <Row label="Username">
                  <input
                    value={prefs.lastfm?.user ?? ''}
                    onChange={(event) =>
                      onChange({
                        ...prefs,
                        lastfm: { key: prefs.lastfm?.key ?? '', user: event.target.value },
                      })
                    }
                    autoComplete="off"
                  />
                </Row>
              </div>
              <div className="settings-row">
                <span className={lastfmNote ? 'is-set' : undefined}>{lastfmNote ?? 'Not checked.'}</span>
                <button className="button-secondary" onClick={checkLastfm} disabled={checking}>
                  {checking ? 'Checking…' : 'Check'}
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="modal-foot">
          <button className="button-ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
