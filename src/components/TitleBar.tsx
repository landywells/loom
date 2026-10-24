import { useCallback, useEffect, useState } from 'react';
import { Copy, Maximize2, Minus, X } from 'lucide-react';
import {
  closeWindow,
  hasWindowChrome,
  isMaximized,
  minimizeWindow,
  onWindowResize,
  toggleMaximize,
} from '../lib/desktop';

/**
 * Loom draws its own window chrome so the bar can carry the app's identity and
 * the current view, instead of a generic grey strip. Only mounted where the
 * shell actually owns a window.
 */
export function TitleBar({ caption }: { caption: string }) {
  const [maximized, setMaximized] = useState(false);

  const sync = useCallback(async () => {
    setMaximized(await isMaximized());
  }, []);

  useEffect(() => {
    if (!hasWindowChrome) return;
    let mounted = true;
    sync();
    const unsubscribe = onWindowResize(() => {
      if (mounted) sync();
    });
    return () => {
      mounted = false;
      unsubscribe.then((fn) => fn());
    };
  }, [sync]);

  if (!hasWindowChrome) return null;

  const handleToggle = async () => {
    await toggleMaximize();
    await sync();
  };

  return (
    <div className="titlebar">
      <div className="titlebar-brand" data-tauri-drag-region>
        <span className="titlebar-mark" aria-hidden="true">
          ✳
        </span>
        <span className="titlebar-name" aria-hidden="true">
          Loom
        </span>
      </div>

      <div className="titlebar-drag" data-tauri-drag-region>
        <span className="titlebar-caption">{caption}</span>
      </div>

      <div className="titlebar-controls">
        <button className="titlebar-button" onClick={minimizeWindow} aria-label="Minimize" title="Minimize">
          <Minus size={15} strokeWidth={1.6} />
        </button>
        <button
          className="titlebar-button"
          onClick={handleToggle}
          aria-label={maximized ? 'Restore down' : 'Maximize'}
          title={maximized ? 'Restore down' : 'Maximize'}
        >
          {maximized ? <Copy size={12} strokeWidth={1.6} /> : <Maximize2 size={12} strokeWidth={1.6} />}
        </button>
        <button
          className="titlebar-button titlebar-close"
          onClick={closeWindow}
          aria-label="Close"
          title="Close"
        >
          <X size={15} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}
