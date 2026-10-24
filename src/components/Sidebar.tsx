import {
  BarChart3,
  Compass,
  Flame,
  Layers3,
  LayoutDashboard,
  LibraryBig,
  Plus,
} from 'lucide-react';
import type { Page } from '../types';
import { CURRENT_USER } from '../lib/data';

const mainNav = [
  { page: 'overview' as Page, label: 'Overview', icon: LayoutDashboard },
  { page: 'library' as Page, label: 'Library', icon: LibraryBig },
  { page: 'discover' as Page, label: 'Discover', icon: Compass },
];

const spaceNav = [
  { page: 'collections' as Page, label: 'Collections', icon: Layers3 },
  { page: 'insights' as Page, label: 'Insights', icon: BarChart3 },
];

interface SidebarProps {
  page: Page;
  onNavigate: (page: Page) => void;
  onAdd: () => void;
  itemCount: number;
  streak: number;
}

export function Sidebar({ page, onNavigate, onAdd, itemCount, streak }: SidebarProps) {
  return (
    <>
      <aside className="sidebar">
        <button className="brand" onClick={() => onNavigate('overview')} aria-label="Loom home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="brand-word">loom</span>
        </button>

        <button className="new-entry" onClick={onAdd}>
          <span className="new-entry-icon">
            <Plus size={16} strokeWidth={2.2} />
          </span>
          <span>New entry</span>
          <span className="new-entry-arrow">↗</span>
        </button>

        <nav className="side-nav" aria-label="Main navigation">
          <span className="nav-label">Your space</span>
          {mainNav.map(({ page: target, label, icon: Icon }) => (
            <button
              key={target}
              className={`nav-item ${page === target ? 'active' : ''}`}
              onClick={() => onNavigate(target)}
              aria-current={page === target ? 'page' : undefined}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {target === 'library' && <span className="nav-count">{itemCount}</span>}
              {target === 'discover' && <span className="nav-new">new</span>}
            </button>
          ))}

          <span className="nav-label nav-label-spaced">Cultivate</span>
          {spaceNav.map(({ page: target, label, icon: Icon }) => (
            <button
              key={target}
              className={`nav-item ${page === target ? 'active' : ''}`}
              onClick={() => onNavigate(target)}
              aria-current={page === target ? 'page' : undefined}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-grow" />

        <div className="streak-card">
          <div className="streak-top">
            <span className="streak-flame">
              <Flame size={15} fill="currentColor" />
            </span>
            <span>{streak} day streak</span>
          </div>
          <p>A few pages a day keeps the noise away.</p>
          <div className="streak-days" aria-hidden="true">
            {Array.from({ length: 7 }).map((_, index) => (
              <span key={index} className={index < Math.min(7, streak) ? 'lit' : ''} />
            ))}
          </div>
        </div>

        <div className="sidebar-user">
          <span className="avatar avatar-sm">
            {CURRENT_USER.initials}
            <i />
          </span>
          <span className="sidebar-user-copy">
            <strong>{CURRENT_USER.fullName}</strong>
            <small>Personal archive</small>
          </span>
          <span className="user-mark" aria-hidden="true">
            ✳
          </span>
        </div>
      </aside>

      <nav className="mobile-tabbar" aria-label="Mobile navigation">
        {mainNav.slice(0, 2).map(({ page: target, label, icon: Icon }) => (
          <button
            key={target}
            className={page === target ? 'active' : ''}
            onClick={() => onNavigate(target)}
            aria-current={page === target ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
        <button className="mobile-add" onClick={onAdd} aria-label="Add media">
          <Plus size={22} />
        </button>
        {[...mainNav.slice(2), ...spaceNav].map(({ page: target, label, icon: Icon }) => (
          <button
            key={target}
            className={page === target ? 'active' : ''}
            onClick={() => onNavigate(target)}
            aria-current={page === target ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
