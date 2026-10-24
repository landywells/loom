import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CoverArt, MediaType } from '../types';
import { TYPE_META } from '../lib/utils';

interface CoverProps {
  title: string;
  creator: string;
  type: MediaType;
  year: number;
  art: CoverArt;
  image?: string | null;
  className?: string;
  hideTitle?: boolean;
  hideMeta?: boolean;
}

export function Cover({
  title,
  creator,
  type,
  year,
  art,
  image,
  className = '',
  hideTitle = false,
  hideMeta = false,
}: CoverProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [image]);

  const showPhoto = Boolean(image) && !failed;

  const style = {
    '--a': art.a,
    '--b': art.b,
    '--c': art.c,
  } as CSSProperties;

  return (
    <div
      className={`cover ${showPhoto ? 'cover--photo' : `art-${art.pattern}`} ${className}`}
      style={style}
      role="img"
      aria-label={`${title} by ${creator}`}
    >
      {showPhoto ? (
        <img
          className="cover-photo"
          src={image ?? undefined}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="cover-shape" aria-hidden="true" />
      )}
      <span className="cover-scrim" aria-hidden="true" />
      <div className="cover-top">
        <span className="cover-type">
          <i />
          {TYPE_META[type].short}
        </span>
        <span>{year}</span>
      </div>
      {!hideTitle && !showPhoto && (
        <div className="cover-bottom">
          {!hideMeta && <span className="cover-creator">{creator}</span>}
          <span className="cover-title">{title}</span>
        </div>
      )}
      <span className="cover-grain" aria-hidden="true" />
      <span className="cover-edge" aria-hidden="true" />
    </div>
  );
}
