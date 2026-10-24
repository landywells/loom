import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Compass,
  CornerDownLeft,
  Download,
  Info,
  Layers3,
  LayoutDashboard,
  LibraryBig,
  Moon,
  Plus,
  Search,
  SlidersHorizontal,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MediaItem, Page, Theme } from '../types';
import { TYPE_META } from '../lib/utils';
import { useFocusTrap } from '../lib/useFocusTrap';
import { Cover } from './Cover';

interface CommandPaletteProps {
  items: MediaItem[];
  theme: Theme;
  onClose: () => void;
  onOpenItem: (id: string) => void;
  onNavigate: (page: Page) => void;
  onAdd: () => void;
  onToggleTheme: () => void;
  onSettings: () => void;
  onExport: () => void;
  onImport: () => void;
  onAbout: () => void;
}

interface PaletteEntry {
  key: string;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  item?: MediaItem;
  action: () => void;
}

interface PaletteSection {
  label: string;
  entries: PaletteEntry[];
}

const pageEntries: { page: Page; label: string; icon: LucideIcon; hint: string }[] = [
  { page: 'overview', label: 'Overview', icon: LayoutDashboard, hint: 'Your daily dashboard' },
  { page: 'library', label: 'Library', icon: LibraryBig, hint: 'Every title you track' },
  { page: 'discover', label: 'Discover', icon: Compass, hint: 'Find something new' },
  { page: 'collections', label: 'Collections', icon: Layers3, hint: 'Curated shelves' },
  { page: 'insights', label: 'Insights', icon: BarChart3, hint: 'The shape of your attention' },
];

export function CommandPalette({
  items,
  theme,
  onClose,
  onOpenItem,
  onNavigate,
  onAdd,
  onToggleTheme,
  onSettings,
  onExport,
  onImport,
  onAbout,
}: CommandPaletteProps) {
  const panelRef = useFocusTrap<HTMLDivElement>();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const sections = useMemo<PaletteSection[]>(() => {
    const normalized = query.trim().toLowerCase();
    const matches = (text: string) => text.toLowerCase().includes(normalized);

    const pages: PaletteEntry[] = pageEntries
      .filter((entry) => !normalized || matches(entry.label) || matches(entry.hint))
      .map(({ page, label, icon, hint }) => ({
        key: `page-${page}`,
        label,
        hint,
        icon,
        action: () => {
          onNavigate(page);
          onClose();
        },
      }));

    const actions: PaletteEntry[] = [
      {
        key: 'action-add',
        label: 'Add a new entry',
        hint: 'Log something you love',
        icon: Plus,
        action: () => {
          onAdd();
          onClose();
        },
      },
      {
        key: 'action-theme',
        label: `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`,
        hint: 'Change the light',
        icon: theme === 'light' ? Moon : Sun,
        action: () => {
          onToggleTheme();
          onClose();
        },
      },
      {
        key: 'action-export',
        label: 'Export your library',
        hint: 'A JSON copy you own',
        icon: Download,
        action: () => {
          onExport();
          onClose();
        },
      },
      {
        key: 'action-import',
        label: 'Import or merge a copy',
        hint: 'Fold another device in',
        icon: Upload,
        action: () => {
          onImport();
          onClose();
        },
      },
      {
        key: 'action-settings',
        label: 'Sync and listening history',
        hint: 'Keys, passphrase, destination',
        icon: SlidersHorizontal,
        action: () => {
          onSettings();
          onClose();
        },
      },
      {
        key: 'action-about',
        label: 'About Loom',
        hint: 'What this is',
        icon: Info,
        action: () => {
          onAbout();
          onClose();
        },
      },
    ].filter((entry) => !normalized || matches(entry.label));

    const matchedItems = items
      .filter(
        (item) =>
          !normalized ||
          matches(item.title) ||
          matches(item.creator) ||
          item.tags.some(matches) ||
          item.genres.some(matches),
      )
      .slice(0, normalized ? 7 : 3);

    const itemEntries: PaletteEntry[] = matchedItems.map((item) => ({
      key: `item-${item.id}`,
      label: item.title,
      hint: `${TYPE_META[item.type].label} · ${item.creator}`,
      item,
      action: () => {
        onOpenItem(item.id);
        onClose();
      },
    }));

    const result: PaletteSection[] = [];
    if (pages.length) result.push({ label: 'Go to', entries: pages });
    if (actions.length) result.push({ label: 'Quick actions', entries: actions });
    if (itemEntries.length) {
      result.push({ label: normalized ? 'In your library' : 'Recently added', entries: itemEntries });
    }
    return result;
  }, [items, query, theme, onNavigate, onAdd, onClose, onToggleTheme, onOpenItem]);

  const flatEntries = sections.flatMap((section) => section.entries);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const runEntry = (entry: PaletteEntry) => {
    entry.action();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % Math.max(flatEntries.length, 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        (current - 1 + Math.max(flatEntries.length, 1)) % Math.max(flatEntries.length, 1),
      );
    }
    if (event.key === 'Enter' && flatEntries[activeIndex]) {
      event.preventDefault();
      runEntry(flatEntries[activeIndex]);
    }
  };

  useEffect(() => {
    const selected = listRef.current?.querySelector<HTMLElement>('.palette-entry.is-active');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  let runningIndex = -1;

  return (
    <div
      className="palette-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} className="palette-panel" role="dialog" aria-modal="true" aria-label="Search Loom">
        <div className="palette-input-row">
          <Search size={19} strokeWidth={1.8} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search your loom, or jump somewhere…"
            aria-label="Search your loom"
          />
          <button className="palette-close" onClick={onClose} aria-label="Close search">
            <X size={15} />
            <kbd>esc</kbd>
          </button>
        </div>

        <div className="palette-body" ref={listRef}>
          {sections.map((section) => (
            <div className="palette-section" key={section.label}>
              <span className="palette-section-label">{section.label}</span>
              {section.entries.map((entry) => {
                runningIndex += 1;
                const Icon = entry.icon;
                const isActive = runningIndex === activeIndex;
                return (
                  <button
                    key={entry.key}
                    className={`palette-entry ${isActive ? 'is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(runningIndex)}
                    onClick={() => runEntry(entry)}
                  >
                    {entry.item ? (
                      <Cover
                        className="palette-cover"
                        title={entry.item.title}
                        creator={entry.item.creator}
                        type={entry.item.type}
                        year={entry.item.year}
                        art={entry.item.art}
                        image={entry.item.image}
                        hideTitle
                        hideMeta
                      />
                    ) : (
                      Icon && (
                        <span className="palette-entry-icon">
                          <Icon size={16} strokeWidth={1.8} />
                        </span>
                      )
                    )}
                    <span className="palette-entry-copy">
                      <strong>{entry.label}</strong>
                      {entry.hint && <small>{entry.hint}</small>}
                    </span>
                    {entry.item ? (
                      <span className="palette-item-type">
                        {TYPE_META[entry.item.type].short}
                      </span>
                    ) : (
                      <ArrowRight size={14} className="palette-arrow" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {flatEntries.length === 0 && (
            <div className="palette-empty">
              <span>✳</span>
              <p>Nothing found. Try another thread.</p>
            </div>
          )}
        </div>

        <div className="palette-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> to move
          </span>
          <span>
            <kbd>
              <CornerDownLeft size={10} />
            </kbd>{' '}
            to open
          </span>
          <span className="palette-foot-brand">LOOM / QUICK FIND</span>
        </div>
      </div>
    </div>
  );
}
