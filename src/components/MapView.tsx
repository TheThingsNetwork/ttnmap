import { useEffect, useMemo, useRef } from 'react';
import maplibregl, { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { ExpressionSpecification } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { Gateway } from '../types/gateway';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLES = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
} as const;
const ttnTenants = new Set(['ttn', 'ttnv2']);

export interface FocusPoint {
  latitude: number;
  longitude: number;
}

interface MapViewProps {
  gateways: Gateway[];
  focusPoint: FocusPoint | null;
  onFocusConsumed: () => void;
  onGatewaySelect?: (gateway: Gateway | null) => void;
  theme: 'dark' | 'light';
}

const clusterColors: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['get', 'point_count'],
  0,
  '#25c5fd',
  200,
  '#805dff',
  800,
  '#f49a7b',
  2000,
  '#ffdf6f',
] as ExpressionSpecification;

const markerPulse: ExpressionSpecification = ['case', ['==', ['get', 'category'], 'ttn'], '#47e7ff', '#ff9db9'] as ExpressionSpecification;

const MapView = ({ gateways, focusPoint, onFocusConsumed, onGatewaySelect, theme }: MapViewProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[theme],
      center: [-30, 15],
      zoom: 1.4,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      hash: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 140 }));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const featureCollection = useMemo<FeatureCollection<Point>>(() => ({
    type: 'FeatureCollection',
    features: gateways
      .filter((gateway) => gateway.location && Number.isFinite(gateway.location.latitude) && Number.isFinite(gateway.location.longitude))
      .map((gateway) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [gateway.location!.longitude, gateway.location!.latitude],
        },
        properties: {
          id: gateway.id,
          tenant: gateway.tenantID,
          category: ttnTenants.has(gateway.tenantID) ? 'ttn' : 'private',
          updatedAt: gateway.updatedAt,
          altitude: gateway.location?.altitude ?? null,
        },
      })),
  }), [gateways]);

  useEffect(() => {
    if (mapRef.current) {
      const style = MAP_STYLES[theme];
      mapRef.current.setStyle(style);
    }
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const applyData = () => {
      const existingSource = map.getSource('gateways') as GeoJSONSource | undefined;
      if (existingSource) {
        existingSource.setData(featureCollection);
        return;
      }

      map.addSource('gateways', {
        type: 'geojson',
        data: featureCollection,
        cluster: true,
        clusterMaxZoom: 9,
        clusterRadius: 55,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'gateways',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': clusterColors,
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'point_count'],
            1,
            16,
            100,
            28,
            1000,
            44,
          ],
          'circle-opacity': 0.9,
        },
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'gateways',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'] as ExpressionSpecification,
          'text-font': ['Open Sans Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#031221',
        },
      });

      map.addLayer({
        id: 'gateways',
        type: 'circle',
        source: 'gateways',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': markerPulse,
          'circle-stroke-color': ['case', ['==', ['get', 'category'], 'ttn'], '#0affff', '#ff6fd8'],
          'circle-stroke-width': 1.4,
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            2,
            3.4,
            8,
            6,
            12,
            12,
          ],
          'circle-opacity': 0.85,
        },
      });
    };

    const onStyleData = () => applyData();

    if (map.isStyleLoaded()) {
      applyData();
    }

    map.on('styledata', onStyleData);

    return () => {
      map.off('styledata', onStyleData);
    };
  }, [featureCollection, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('gateways')) {
      return;
    }

    const onClusterClick = (event: maplibregl.MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ['clusters'] });
      const feature = features[0];
      if (!feature) {
        return;
      }
      const rawClusterId = feature.properties?.cluster_id;
      const clusterId = typeof rawClusterId === 'number' ? rawClusterId : Number(rawClusterId);
      const source = map.getSource('gateways') as GeoJSONSource;
      if (!source || Number.isNaN(clusterId)) {
        return;
      }
      source
        .getClusterExpansionZoom(clusterId)
        .then((zoom) => {
          const [longitude, latitude] =
            feature.geometry?.type === 'Point'
              ? (feature.geometry.coordinates as [number, number])
              : [event.lngLat.lng, event.lngLat.lat];
          map.easeTo({ center: [longitude, latitude], zoom, duration: 900 });
        })
        .catch(() => undefined);
    };

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, maxWidth: '280px' });

    const onPointClick = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const { id, tenant, updatedAt, altitude } = feature.properties as Record<string, string>;
      const html = `
        <div class="space-y-1">
          <div class="text-xs uppercase tracking-[0.2em] text-slate-400">Gateway</div>
          <div class="text-lg font-semibold text-white">${id}</div>
          <div class="text-sm text-slate-300">Network: ${tenant?.toUpperCase?.() ?? tenant}</div>
          <div class="text-sm text-slate-300">Updated: ${new Date(updatedAt).toLocaleString()}</div>
          ${altitude ? `<div class="text-sm text-slate-300">Altitude: ${altitude}m</div>` : ''}
        </div>
      `;
      popup
        .setLngLat(event.lngLat)
        .setHTML(html)
        .addTo(map);

      if (typeof id === 'string') {
        const selected = gateways.find((gateway) => gateway.id === id);
        onGatewaySelect?.(selected ?? null);
      }
    };

    const onLeave = () => popup.remove();

    const onGatewayEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const onClusterEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const onClusterLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', 'clusters', onClusterClick);
    map.on('click', 'gateways', onPointClick);
    map.on('mouseleave', 'gateways', onLeave);
    map.on('mouseenter', 'gateways', onGatewayEnter);
    map.on('mouseenter', 'clusters', onClusterEnter);
    map.on('mouseleave', 'clusters', onClusterLeave);

    return () => {
      popup.remove();
      map.off('click', 'clusters', onClusterClick);
      map.off('click', 'gateways', onPointClick);
      map.off('mouseleave', 'gateways', onLeave);
      map.off('mouseenter', 'gateways', onGatewayEnter);
      map.off('mouseenter', 'clusters', onClusterEnter);
      map.off('mouseleave', 'clusters', onClusterLeave);
    };
  }, [featureCollection, gateways, onGatewaySelect, theme]);

  useEffect(() => {
    if (!focusPoint || !mapRef.current) {
      return;
    }

    mapRef.current.flyTo({
      center: [focusPoint.longitude, focusPoint.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 6.5),
      speed: 1.4,
      curve: 1.6,
    });
    onFocusConsumed();
  }, [focusPoint, onFocusConsumed]);

  return <div ref={mapContainerRef} className="h-full w-full" />;
};

export default MapView;
