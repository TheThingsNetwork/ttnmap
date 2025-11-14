import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Gateway } from '../types/gateway';

const API_URL = 'https://mapper.packetbroker.net/api/v2/gateways';

interface UseGatewaysResult {
  gateways: Gateway[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: Date | null;
}

export function useGateways(): UseGatewaysResult {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchGateways = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Unable to reach Packet Broker');
      }

      const payload = (await response.json()) as Gateway[];
      setGateways(payload);

      const newestTimestamp = payload
        .map((gateway) => new Date(gateway.updatedAt).getTime())
        .filter((value) => Number.isFinite(value));

      if (newestTimestamp.length > 0) {
        setLastUpdated(new Date(Math.max(...newestTimestamp)));
      } else {
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  return useMemo(() => ({
    gateways,
    loading,
    error,
    refresh: fetchGateways,
    lastUpdated,
  }), [gateways, loading, error, fetchGateways, lastUpdated]);
}
