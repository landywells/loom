import {
  BookMarked,
  BookOpen,
  Film,
  Gamepad2,
  MonitorPlay,
  Music2,
  PanelsTopLeft,
  Podcast,
  Sparkles,
  Tv,
  type LucideIcon,
} from 'lucide-react';
import type { MediaType } from '../types';

export const TYPE_ICON: Record<MediaType, LucideIcon> = {
  movie: Film,
  show: Tv,
  anime: Sparkles,
  book: BookOpen,
  comic: PanelsTopLeft,
  manga: BookMarked,
  music: Music2,
  video: MonitorPlay,
  game: Gamepad2,
  podcast: Podcast,
};

export const TYPE_COLOR: Record<MediaType, string> = {
  movie: '#c65b3e',
  show: '#3e6484',
  anime: '#8466a0',
  book: '#9b7a4f',
  comic: '#bb4b3a',
  manga: '#516250',
  music: '#b18a3d',
  video: '#b54738',
  game: '#547062',
  podcast: '#5e5b78',
};

export function MediaGlyph({
  type,
  size = 16,
  strokeWidth = 1.8,
  className,
}: {
  type: MediaType;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const Icon = TYPE_ICON[type];
  return <Icon size={size} strokeWidth={strokeWidth} className={className} />;
}
