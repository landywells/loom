import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../lib/useFocusTrap';
import { SHORTCUT_MOD } from '../lib/utils';

const keys: { combo: string[]; label: string }[] = [
  { combo: [SHORTCUT_MOD, 'K'], label: 'Quick find — search or jump anywhere' },
  { combo: ['/'], label: 'Same thing, one keystroke' },
  { combo: ['N'], label: 'Add something new' },
  { combo: ['1'], label: 'Overview' },
  { combo: ['2'], label: 'Library' },
  { combo: ['3'], label: 'Discover' },
  { combo: ['4'], label: 'Collections' },
  { combo: ['5'], label: 'Insights' },
  { combo: ['↑', '↓'], label: 'Move through quick find' },
  { combo: ['↵'], label: 'Open what is highlighted' },
  { combo: ['Esc'], label: 'Close whatever is open' },
];

export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  const panelRef = useFocusTrap<HTMLDivElement>();
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} className="modal-panel shortcut-sheet" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <div className="modal-head">
          <div>
            <span className="eyebrow">For the keyboard people</span>
            <h2>Shortcuts</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>
        <ul className="shortcut-list">
          {keys.map((entry) => (
            <li key={entry.label}>
              <span className="shortcut-keys">
                {entry.combo.map((combo) => (
                  <kbd key={combo}>{combo}</kbd>
                ))}
              </span>
              <span>{entry.label}</span>
            </li>
          ))}
        </ul>
        <p className="shortcut-foot">
          Shortcuts rest while you are typing, so nothing fires by accident.
        </p>
      </div>
    </div>
  );
}
