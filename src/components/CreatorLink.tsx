import { EMPTY_LIBRARY_QUERY, buildLibraryHash } from '../lib/utils';

/**
 * Sends a creator name to the library's shareable filter URL. Assigning the
 * hash (rather than pushState) is deliberate: it fires hashchange so the app
 * can switch pages from anywhere a creator is shown.
 */
export function CreatorLink({
  name,
  className = 'creator-link',
  children,
}: {
  name: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const open = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const hash = buildLibraryHash({ ...EMPTY_LIBRARY_QUERY, creator: name });
    if (window.location.hash !== hash) window.location.hash = hash;
  };

  return (
    <button
      type="button"
      className={className}
      onClick={open}
      title={`Everything by ${name}`}
    >
      {children ?? name}
    </button>
  );
}
