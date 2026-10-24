import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Collection, MediaItem } from '../types';
import { TYPE_META } from '../lib/utils';
import { useFocusTrap } from '../lib/useFocusTrap';
import { Cover } from './Cover';

interface CollectionFormProps {
  items: MediaItem[];
  /** Omitted when making a new shelf, supplied to edit an existing one. */
  collection?: Collection | null;
  onClose: () => void;
  onSave: (collection: Collection | (Omit<Collection, 'id'> & { id?: string })) => void;
}

const accents = [
  { value: '#d9c7a8', label: 'Parchment' },
  { value: '#c4a66c', label: 'Ochre' },
  { value: '#283a4d', label: 'Midnight' },
  { value: '#b8c4a5', label: 'Sage' },
  { value: '#d98e72', label: 'Terracotta' },
  { value: '#cdbfd8', label: 'Lilac' },
];

function isDark(hex: string): boolean {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

export function CollectionForm({ items, collection, onClose, onSave }: CollectionFormProps) {
  const panelRef = useFocusTrap<HTMLDivElement>();
  const [name, setName] = useState(collection?.name ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');
  const [accent, setAccent] = useState(collection?.accent ?? accents[0].value);
  const [selectedIds, setSelectedIds] = useState<string[]>(collection?.itemIds ?? []);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.creator.toLowerCase().includes(normalized),
    );
  }, [items, query]);

  const toggleItem = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  };

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      ...(collection ? { id: collection.id } : {}),
      name: name.trim(),
      description:
        description.trim() || 'A small constellation of things that belong together.',
      itemIds: selectedIds,
      accent,
    });
  };

  const ink = isDark(accent) ? '#f3edde' : '#201c15';

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} className="modal-panel collection-form" role="dialog" aria-modal="true" aria-labelledby="collection-form-title">
        <div className="modal-head">
          <div>
            <span className="eyebrow">{collection ? 'Rework a shelf' : 'A new shelf'}</span>
            <h2 id="collection-form-title">{collection ? 'Edit collection' : 'Make a collection'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="collection-form-body">
          <div className="collection-form-fields">
            <label className="field">
              <span>Collection name</span>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Rainy Sunday cinema"
                maxLength={48}
              />
            </label>
            <label className="field">
              <span>Description <small>optional</small></span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What ties these together?"
                rows={3}
                maxLength={160}
              />
            </label>
            <div className="field">
              <span>Color</span>
              <div className="accent-options">
                {accents.map((option) => (
                  <button
                    key={option.value}
                    className={accent === option.value ? 'active' : ''}
                    style={{ '--swatch': option.value } as CSSProperties}
                    onClick={() => setAccent(option.value)}
                    aria-label={option.label}
                    aria-pressed={accent === option.value}
                    type="button"
                  >
                    {accent === option.value && <Check size={12} />}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="collection-preview"
              style={{ '--preview-bg': accent, '--preview-ink': ink } as CSSProperties}
            >
              <span className="preview-kicker">Collection preview</span>
              <strong>{name || 'Untitled shelf'}</strong>
              <span>{selectedIds.length} pieces gathered</span>
              <span className="preview-star">✳</span>
            </div>
          </div>

          <div className="collection-picker">
            <div className="picker-head">
              <span>Choose pieces</span>
              <span>{selectedIds.length} selected</span>
            </div>
            <label className="picker-search">
              <Search size={14} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find something in your library…"
              />
            </label>
            <div className="picker-list">
              {filteredItems.map((item) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <button
                    type="button"
                    className={`picker-row ${selected ? 'selected' : ''}`}
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                  >
                    <Cover
                      className="picker-cover"
                      title={item.title}
                      creator={item.creator}
                      type={item.type}
                      year={item.year}
                      art={item.art}
                      image={item.image}
                      hideTitle
                      hideMeta
                    />
                    <span className="picker-copy">
                      <strong>{item.title}</strong>
                      <small>
                        {TYPE_META[item.type].short} · {item.creator}
                      </small>
                    </span>
                    <span className="picker-check">
                      {selected ? <Check size={13} /> : <Plus size={13} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="button-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button-primary" onClick={submit} disabled={!name.trim()}>
            {collection ? 'Save changes' : 'Create collection'}
          </button>
        </div>
      </div>
    </div>
  );
}
