import { ReactNode, useEffect, useMemo, useState } from 'react';
import { FiLayers, FiRefreshCcw, FiShield, FiSidebar, FiWifi, FiX } from 'react-icons/fi';
import MapView, { FocusPoint } from './components/MapView';
import LocationSearch from './components/LocationSearch';
import { useGateways } from './hooks/useGateways';
import type { Gateway } from './types/gateway';

const ttnTenants = new Set(['ttn', 'ttnv2']);

const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const App = () => {
  const { gateways, loading, error, lastUpdated } = useGateways();
  const [showTTN, setShowTTN] = useState(true);
  const [showPrivate, setShowPrivate] = useState(true);
  const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);

  const onlineGateways = useMemo(
    () => gateways.filter((gateway) => gateway.online && gateway.location),
    [gateways],
  );

  const visibleGateways = useMemo(() => {
    return onlineGateways.filter((gateway) => {
      const belongsToTTN = ttnTenants.has(gateway.tenantID);
      if (!showTTN && belongsToTTN) return false;
      if (!showPrivate && !belongsToTTN) return false;
      return true;
    });
  }, [onlineGateways, showTTN, showPrivate]);

  useEffect(() => {
    if (selectedGateway && !visibleGateways.some((gateway) => gateway.id === selectedGateway.id)) {
      setSelectedGateway(null);
    }
  }, [visibleGateways, selectedGateway]);

  const ttnCount = onlineGateways.filter((gateway) => ttnTenants.has(gateway.tenantID)).length;
  const privateCount = Math.max(onlineGateways.length - ttnCount, 0);

  const toggleAllOff = !showTTN && !showPrivate;

  const handleSearchSelect = (point: FocusPoint) => {
    setFocusPoint(point);
  };

  const handleGatewaySelect = (gateway: Gateway | null) => {
    setSelectedGateway(gateway);
  };

  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
    : '—';

  const heroSubtitle = loading
    ? 'Fetching live gateway data from Packet Broker…'
    : `${formatNumber(visibleGateways.length)} gateways are visible with the current filters.`;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <MapView
        gateways={toggleAllOff ? [] : (visibleGateways as Gateway[])}
        focusPoint={focusPoint}
        onFocusConsumed={() => setFocusPoint(null)}
        onGatewaySelect={handleGatewaySelect}
      />
      {dashboardOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-6 pt-6">
          <div className="flex w-full max-w-6xl flex-col gap-4">
            <div className="pointer-events-auto glass-panel rounded-3xl p-6 text-white">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">The Things Network</p>
                  <h1 className="font-display text-4xl font-semibold text-white">Gateway Atlas</h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">{heroSubtitle}</p>
                </div>
                <div className="flex w-full flex-col items-end gap-3 sm:w-auto">
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/30"
                    onClick={() => setDashboardOpen(false)}
                  >
                    Close <FiX />
                  </button>
                  <LocationSearch onSelect={handleSearchSelect} />
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Online gateways"
                  value={formatNumber(onlineGateways.length)}
                  icon={<FiWifi />}
                />
                <StatCard
                  label="Things Stack"
                  value={formatNumber(ttnCount)}
                  sublabel="The Things Network + TTNv2"
                  icon={<FiLayers />}
                  active={showTTN}
                  onToggle={() => setShowTTN((value) => !value)}
                />
                <StatCard
                  label="Private networks"
                  value={formatNumber(privateCount)}
                  sublabel="Other Packet Broker participants"
                  icon={<FiShield />}
                  active={showPrivate}
                  onToggle={() => setShowPrivate((value) => !value)}
                />
                <StatCard
                  label="Last updated"
                  value={lastUpdatedLabel}
                  sublabel="Packet Broker telemetry"
                  icon={<FiRefreshCcw />}
                />
              </div>
            </div>
          <div className="pointer-events-auto">
            <div className="glass-panel rounded-3xl p-6">
              <h2 className="font-display text-lg text-white">Gateway details</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Click a gateway on the map to inspect it</p>
              {selectedGateway ? (
                <GatewayDetails gateway={selectedGateway} />
              ) : (
                <p className="mt-4 text-sm text-slate-400">
                  {loading ? 'Loading live data…' : 'Select any gateway pinpoint to see its IDs, hardware placement, and coordinates.'}
                </p>
              )}
            </div>
          </div>
        </div>
        </div>
      )}
      {!dashboardOpen && (
        <button
          className="pointer-events-auto absolute top-6 right-6 z-10 inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-[#050914]/80 px-4 py-2 text-sm text-white shadow-lg transition hover:border-white"
          onClick={() => setDashboardOpen(true)}
        >
          <FiSidebar /> Open dashboard
        </button>
      )}
      <div className="pointer-events-auto absolute bottom-6 left-6 flex flex-wrap items-center gap-4 rounded-full bg-[#050914]/70 px-4 py-2 text-xs text-slate-400">
        <LegendSwatch color="#47e7ff" label="The Things Stack" />
        <LegendSwatch color="#ff9db9" label="Private network" />
        {error && <span className="text-red-300">{error}</span>}
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: ReactNode;
  active?: boolean;
  onToggle?: () => void;
}

const StatCard = ({ label, value, sublabel, icon, active = true, onToggle }: StatCardProps) => {
  const isInteractive = Boolean(onToggle);
  const className = [
    'flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 shadow-inner shadow-white/5',
    isInteractive ? 'cursor-pointer transition hover:border-white/20' : '',
    isInteractive && !active ? 'opacity-40' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    if (!isInteractive) return;
    onToggle?.();
  };

  return (
    <button className={className} onClick={handleClick} type={isInteractive ? 'button' : undefined}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>{icon}</span>
        {label}
      </div>
      <div className="font-display text-3xl text-white">{value}</div>
      {sublabel && <div className="text-sm text-slate-400">{sublabel}</div>}
    </button>
  );
};

const GatewayDetails = ({ gateway }: { gateway: Gateway }) => {
  const coordinateText = gateway.location
    ? `${gateway.location.latitude.toFixed(4)}, ${gateway.location.longitude.toFixed(4)}`
    : 'Location not provided';
  const antenna = gateway.antennaPlacement
    ? gateway.antennaPlacement === 'INDOOR'
      ? 'Indoor installation'
      : 'Outdoor installation'
    : 'Not specified';

  const detailItems = [
    { label: 'Gateway name', value: gateway.name ?? 'Not provided' },
    { label: 'Gateway ID', value: gateway.id },
    { label: 'Gateway EUI', value: gateway.eui ?? 'Not provided' },
    { label: 'Tenant (Network)', value: gateway.tenantID },
    { label: 'Net ID', value: gateway.netID },
    { label: 'Cluster', value: gateway.clusterID ?? 'Not reported' },
  ];

  const locationItems = [
    { label: 'Coordinates', value: coordinateText },
    { label: 'Altitude', value: gateway.location?.altitude ? `${gateway.location.altitude} m` : 'Not reported' },
    { label: 'Accuracy', value: gateway.location?.accuracy ? `${gateway.location.accuracy} m` : 'Not reported' },
  ];

  return (
    <div className="mt-5 space-y-5 text-sm text-slate-200">
      <SectionGrid title="Identity" items={detailItems} />
      <SectionGrid title="Location" items={locationItems} />
      <SectionGrid
        title="Status"
        items={[
          { label: 'Online state', value: gateway.online ? 'Online in Packet Broker' : 'Offline' },
          { label: 'Last updated', value: new Date(gateway.updatedAt).toLocaleString() },
          { label: 'Antenna placement', value: antenna },
        ]}
      />
    </div>
  );
};

const SectionGrid = ({ title, items }: { title: string; items: { label: string; value: string }[] }) => (
  <div>
    <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{title}</p>
    <div className="mt-3 grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-white/5 px-5 py-4">
          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
          <p className="mt-2 text-base text-white">{item.value}</p>
        </div>
      ))}
    </div>
  </div>
);

const LegendSwatch = ({ color, label }: { color: string; label: string }) => (
  <span className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[0.7rem]">
    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
    {label}
  </span>
);

export default App;
