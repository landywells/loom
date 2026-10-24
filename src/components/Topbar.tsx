import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bell,
  CheckCheck,
  Moon,
  Plus,
  Search,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import type { Activity, Page, Theme } from '../types';
import { CURRENT_USER } from '../lib/data';
import { isDesktop } from '../lib/desktop';
import { SHORTCUT_MOD, relativeTime } from '../lib/utils';
import { MediaGlyph } from './MediaGlyph';

const pageLabels: Record<Page, string> = {
  overview: 'Overview',
  library: 'Library',
  discover: 'Discover',
  collections: 'Collections',
  insights: 'Insights',
};

interface TopbarProps {
  page: Page;
  onSearch: () => void;
  onAdd: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onSettings: () => void;
  activities: Activity[];
  onOpenItem: (id: string) => void;
  onNavigate: (page: Page) => void;
  itemCount: number;
  formatCount: number;
  streak: number;
}

export function Topbar({
  page,
  onSearch,
  onAdd,
  theme,
  onToggleTheme,
  onSettings,
  activities,
  onOpenItem,
  onNavigate,
  itemCount,
  formatCount,
  streak,
}: TopbarProps) {
  const [menu, setMenu] = useState<'notifications' | 'profile' | null>(null);
  const [readAll, setReadAll] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) setMenu(null);
    };
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, []);

  const recent = activities.slice(0, 4);

  return (
    <header className="topbar">
      <div className="topbar-context">
        <button className="mini-brand" onClick={() => onNavigate('overview')} aria-label="Loom home">
          <span className="mini-brand-mark">✳</span>
          <span>loom</span>
        </button>
        <span className="topbar-crumb">
          <span className="crumb-root">Your loom</span>
          <span className="crumb-slash">/</span>
          <span>{pageLabels[page]}</span>
        </span>
      </div>

      <button className="search-trigger" onClick={onSearch}>
        <Search size={16} strokeWidth={1.8} />
        <span>Search your loom</span>
        <kbd>{SHORTCUT_MOD} K</kbd>
      </button>

      <div className="top-actions" ref={actionsRef}>
        <button className="icon-button mobile-add-button" onClick={onAdd} aria-label="Add media">
          <Plus size={18} />
        </button>
        <button
          className="icon-button theme-button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        <button
          className={`icon-button ${menu === 'notifications' ? 'is-open' : ''}`}
          onClick={() => setMenu(menu === 'notifications' ? null : 'notifications')}
          aria-label="Notifications"
          aria-expanded={menu === 'notifications'}
        >
          <Bell size={17} />
          {!readAll && <span className="notification-dot" />}
        </button>
        <button
          className={`avatar avatar-md ${menu === 'profile' ? 'is-open' : ''}`}
          onClick={() => setMenu(menu === 'profile' ? null : 'profile')}
          aria-label="Open profile menu"
          aria-expanded={menu === 'profile'}
        >
          {CURRENT_USER.initials}
          <i />
        </button>

        {menu === 'notifications' && (
          <div className="popover notifications-popover">
            <div className="popover-head">
              <div>
                <span className="popover-kicker">Your loom</span>
                <h3>Notifications</h3>
              </div>
              <button
                className="quiet-icon-button"
                onClick={() => setReadAll(true)}
                aria-label="Mark all notifications as read"
                title="Mark all as read"
              >
                <CheckCheck size={15} />
              </button>
            </div>
            <div className="notification-list">
              {recent.map((activity, index) => (
                <button
                  key={activity.id}
                  className="notification-row"
                  onClick={() => {
                    onOpenItem(activity.itemId);
                    setMenu(null);
                  }}
                >
                  <span className="notification-icon">
                    <MediaGlyph type={activity.type} size={15} />
                  </span>
                  <span className="notification-copy">
                    <strong>{activity.itemTitle}</strong>
                    <span>{activity.label}</span>
                    <small>{relativeTime(activity.at)}</small>
                  </span>
                  {!readAll && index < 2 && <i className="unread-dot" />}
                </button>
              ))}
            </div>
            <button
              className="popover-footer"
              onClick={() => {
                onNavigate('insights');
                setMenu(null);
              }}
            >
              See the full story <ArrowUpRight size={14} />
            </button>
          </div>
        )}

        {menu === 'profile' && (
          <div className="popover profile-popover">
            <div className="profile-head">
              <span className="avatar avatar-lg">{CURRENT_USER.initials}</span>
              <div>
                <h3>{CURRENT_USER.fullName}</h3>
                <span>Curating since 2024</span>
              </div>
            </div>
            <div className="profile-stats">
              <div>
                <strong>{itemCount}</strong>
                <span>titles</span>
              </div>
              <div>
                <strong>{formatCount}</strong>
                <span>formats</span>
              </div>
              <div>
                <strong>{streak}</strong>
                <span>day streak</span>
              </div>
            </div>
            <div className="appearance-block">
              <span className="appearance-label">Appearance</span>
              <div className="theme-switch">
                <button
                  className={theme === 'light' ? 'active' : ''}
                  onClick={() => theme !== 'light' && onToggleTheme()}
                >
                  <Sun size={14} /> Light
                </button>
                <button
                  className={theme === 'dark' ? 'active' : ''}
                  onClick={() => theme !== 'dark' && onToggleTheme()}
                >
                  <Moon size={14} /> Dark
                </button>
              </div>
            </div>
            <button className="settings-link" onClick={onSettings}>
              <SlidersHorizontal size={13} />
              Sync and listening history
            </button>
            <p className="profile-note">
              A quiet home for everything you’re into. Your library lives {isDesktop ? 'on this device' : 'in this browser'}.
            </p>
          </div>
        )}
      </div>
    </header>
  );
}
