import { useState } from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  size?: number;
  showValue?: boolean;
  className?: string;
}

export function RatingStars({
  value,
  onChange,
  size = 14,
  showValue = false,
  className = '',
}: RatingStarsProps) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const interactive = Boolean(onChange);

  return (
    <span
      className={`rating-stars ${interactive ? 'is-interactive' : ''} ${className}`}
      onMouseLeave={() => setHover(null)}
      role={interactive ? 'group' : undefined}
      aria-label={interactive ? 'Choose a rating' : value ? `Rated ${value} out of 5` : 'Not rated'}
    >
      <span className="stars-row" aria-hidden={interactive ? undefined : true}>
        {[0, 1, 2, 3, 4].map((index) => {
          const fill = Math.min(1, Math.max(0, shown - index)) * 100;
          return (
            <span className="star" key={index} style={{ width: size, height: size }}>
              <Star className="star-base" size={size} strokeWidth={1.7} />
              <span className="star-fill" style={{ width: `${fill}%` }}>
                <Star size={size} strokeWidth={1.7} fill="currentColor" />
              </span>
              {interactive && (
                <>
                  <button
                    type="button"
                    className="star-hit star-hit-left"
                    aria-label={`Rate ${index + 0.5} out of 5`}
                    onMouseEnter={() => setHover(index + 0.5)}
                    onClick={() => onChange?.(value === index + 0.5 ? null : index + 0.5)}
                  />
                  <button
                    type="button"
                    className="star-hit star-hit-right"
                    aria-label={`Rate ${index + 1} out of 5`}
                    onMouseEnter={() => setHover(index + 1)}
                    onClick={() => onChange?.(value === index + 1 ? null : index + 1)}
                  />
                </>
              )}
            </span>
          );
        })}
      </span>
      {showValue && value !== null && <span className="rating-value">{value.toFixed(1)}</span>}
    </span>
  );
}
