import { useEffect, useState } from 'react';
import { FiMapPin, FiSearch } from 'react-icons/fi';
import type { FocusPoint } from './MapView';

interface LocationSearchProps {
  onSelect: (location: FocusPoint) => void;
}

interface PhotonFeature {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    name?: string;
    city?: string;
    country?: string;
    state?: string;
  };
}

const LocationSearch = ({ onSelect }: LocationSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PhotonFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const debounce = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Geocoding service unavailable');
        }
        const payload = await response.json();
        setResults(payload.features ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(debounce);
    };
  }, [query]);

  const handleSelect = (feature: PhotonFeature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    onSelect({ latitude, longitude });
    setQuery(feature.properties.name ?? '');
    setResults([]);
  };

  return (
    <div className="relative w-full max-w-sm">
      <div className="glass-panel flex items-center gap-3 rounded-2xl px-4 py-3">
        <FiSearch className="text-slate-400 text-xl" />
        <input
          type="search"
          placeholder="Jump to a city or landmark"
          className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {loading && <div className="text-xs text-slate-400">Searching…</div>}
      </div>
      {(results.length > 0 || error) && (
        <div className="absolute left-0 right-0 top-[110%] z-20 space-y-1 rounded-2xl bg-[#0b1221]/95 p-2 shadow-2xl">
          {error && (
            <div className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
          )}
          {results.map((feature, index) => {
            const description = [feature.properties.city, feature.properties.state, feature.properties.country]
              .filter(Boolean)
              .join(' · ');
            return (
              <button
                key={`${feature.geometry.coordinates.join(',')}-${index}`}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                onClick={() => handleSelect(feature)}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-300">
                  <FiMapPin />
                </span>
                <span>
                  <div className="font-medium text-white">
                    {feature.properties.name ?? 'Unnamed location'}
                  </div>
                  {description && <div className="text-xs text-slate-400">{description}</div>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
