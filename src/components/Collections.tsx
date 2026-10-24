import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Collection, MediaItem } from '../types';
import { TYPE_META } from '../lib/utils';
import { Cover } from './Cover';
import { MediaCard } from './MediaCard';

interface CollectionsProps {
  collections: Collection[];
  items: MediaItem[];
  onOpenItem: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onNewCollection: () => void;
  onEditCollection: (collection: Collection) => void;
  onToggleCollectionItem: (collectionId: string, itemId: string) => void;
  onDeleteCollection: (id: string) => void;
}

function isDark(hex: string): boolean {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

export function Collections({
  collections,
  items,
  onOpenItem,
  onToggleFavorite,
  onNewCollection,
  onEditCollection,
  onToggleCollectionItem,
  onDeleteCollection,
}: CollectionsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selected = collections.find((collection) => collection.id === selectedId) ?? null;
  const selectedItems = selected
    ? selected.itemIds
        .map((id) => items.find((item) => item.id === id))
        .filter((item): item is MediaItem => Boolean(item))
    : [];

  const openCollection = (id: string) => {
    setSelectedId(id);
    setConfirmDelete(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeCollection = () => {
    setSelectedId(null);
    setConfirmDelete(false);
  };

  if (selected) {
    const ink = isDark(selected.accent) ? '#f1eadb' : '#201c15';
    const formatCount = new Set(selectedItems.map((item) => item.type)).size;
    return (
      <div className="page collections-page">
        <button className="back-link" onClick={closeCollection}>
          <ArrowLeft size={15} /> All collections
        </button>

        <section
          className="collection-detail-hero"
          style={
            {
              '--collection-bg': selected.accent,
              '--collection-ink': ink,
            } as CSSProperties
          }
        >
          <div className="collection-detail-copy">
            <span className="eyebrow">A collection · {selectedItems.length} pieces</span>
            <h1>{selected.name}</h1>
            <p>{selected.description}</p>
            <div className="collection-detail-meta">
              <span>{formatCount} formats</span>
              <span>Curated by Alex</span>
            </div>
          </div>
          <div className="collection-collage collection-collage-large" aria-hidden="true">
            {selectedItems.slice(0, 3).map((item, index) => (
              <div className={`collage-cover collage-${index}`} key={item.id}>
                <Cover
                  title={item.title}
                  creator={item.creator}
                  type={item.type}
                  year={item.year}
                  art={item.art}
                  image={item.image}
                  hideTitle
                  hideMeta
                />
              </div>
            ))}
          </div>
          <div className="collection-detail-actions">
            {confirmDelete ? (
              <div className="inline-confirm">
                <span>Delete this collection?</span>
                <button
                  className="danger-text"
                  onClick={() => {
                    onDeleteCollection(selected.id);
                    closeCollection();
                  }}
                >
                  Yes, delete
                </button>
                <button onClick={() => setConfirmDelete(false)}>Keep it</button>
              </div>
            ) : (
              <div className="collection-detail-buttons">
                <button className="quiet-collection-edit" onClick={() => onEditCollection(selected)}>
                  <Pencil size={13} /> Edit shelf
                </button>
                <button className="quiet-collection-delete" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="section-heading collection-item-heading">
          <div>
            <span className="eyebrow">Inside this shelf</span>
            <h2>{selectedItems.length ? 'The good stuff' : 'An empty shelf, for now'}</h2>
          </div>
          <div className="collection-heading-side">
            <span className="section-side-note">
              {selectedItems.length} of {items.length} titles
            </span>
            <button className="text-link" onClick={() => onEditCollection(selected)}>
              Add or remove titles <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        {selectedItems.length ? (
          <div className="library-grid">
            {selectedItems.map((item) => (
              <div className="collection-member" key={item.id}>
                <MediaCard
                  item={item}
                  onOpen={onOpenItem}
                  onFavorite={onToggleFavorite}
                />
                <button
                  className="collection-member-remove"
                  onClick={() => onToggleCollectionItem(selected.id, item.id)}
                  title={`Take ${item.title} out of this shelf`}
                >
                  <Minus size={12} />
                  Take out
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <span className="empty-mark">✳</span>
            <h2>A quiet start.</h2>
            <p>This shelf has nothing on it yet — use “Add or remove titles” to fill it.</p>
            <div className="empty-actions">
              <button className="button-primary" onClick={() => onEditCollection(selected)}>
                <Plus size={15} /> Add titles
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page collections-page">
      <section className="page-intro">
        <div className="page-intro-copy">
          <span className="eyebrow">Curation · {collections.length} shelves</span>
          <h1>
            Collected <em>with care.</em>
          </h1>
          <p>Small constellations of things that belong together.</p>
        </div>
        <div className="intro-actions">
          <button className="button-primary" onClick={onNewCollection}>
            <Plus size={16} />
            New collection
          </button>
        </div>
      </section>

      <div className="collections-note">
        <span className="collections-note-index">
          01 — {String(collections.length).padStart(2, '0')}
        </span>
        <p>
          A collection isn’t a category. It’s a mood, a season, a sentence you want to
          keep finishing.
        </p>
      </div>

      <div className="collection-grid">
        {collections.map((collection, index) => {
          const collectionItems = collection.itemIds
            .map((id) => items.find((item) => item.id === id))
            .filter((item): item is MediaItem => Boolean(item));
          const ink = isDark(collection.accent) ? '#f1eadb' : '#201c15';
          const formats = Array.from(new Set(collectionItems.map((item) => TYPE_META[item.type].short)));
          return (
            <button
              className="collection-card"
              key={collection.id}
              onClick={() => openCollection(collection.id)}
              style={
                {
                  '--collection-bg': collection.accent,
                  '--collection-ink': ink,
                } as CSSProperties
              }
            >
              <div className="collection-card-top">
                <span>Collection {String(index + 1).padStart(2, '0')}</span>
                <ArrowUpRight size={17} />
              </div>
              <div className="collection-collage" aria-hidden="true">
                {collectionItems.slice(0, 3).map((item, coverIndex) => (
                  <div className={`collage-cover collage-${coverIndex}`} key={item.id}>
                    <Cover
                      title={item.title}
                      creator={item.creator}
                      type={item.type}
                      year={item.year}
                      art={item.art}
                  image={item.image}
                      hideTitle
                      hideMeta
                    />
                  </div>
                ))}
                <span className="collage-mark">✳</span>
              </div>
              <div className="collection-card-copy">
                <h2>{collection.name}</h2>
                <p>{collection.description}</p>
              </div>
              <div className="collection-card-foot">
                <span>{collectionItems.length} pieces</span>
                <span>{formats.slice(0, 3).join(' · ') || 'Waiting for its first'}</span>
              </div>
            </button>
          );
        })}

        <button className="new-collection-card" onClick={onNewCollection}>
          <span className="new-collection-plus">
            <Plus size={20} />
          </span>
          <div>
            <h2>Start a new shelf</h2>
            <p>Gather a few things that feel like the same moment.</p>
          </div>
          <span className="new-collection-link">
            Create a collection <ArrowUpRight size={14} />
          </span>
        </button>
      </div>
    </div>
  );
}
