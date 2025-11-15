import { useEffect, useMemo, useState } from 'react';
import { FiMoon, FiRefreshCcw, FiSun } from 'react-icons/fi';
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
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') {
      return 'dark';
    }
    const stored = window.localStorage.getItem('ttn-theme');
    return stored === 'light' ? 'light' : 'dark';
  });

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ttn-theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => setTheme((value) => (value === 'dark' ? 'light' : 'dark'));
  const isDark = theme === 'dark';

  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
    : '—';

  return (
    <div className={`relative h-screen w-screen overflow-hidden ${isDark ? 'bg-[#050914] text-white' : 'bg-[#f5f6fb] text-slate-900'}`}>
      <div
        className={`pointer-events-auto absolute left-6 top-6 z-20 flex max-w-md flex-col gap-3 rounded-3xl border p-5 ${
          isDark ? 'border-white/10 bg-[#050914]/85 text-white' : 'border-slate-200 bg-white/95 text-slate-900 shadow-xl'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {loading ? 'Fetching live gateway data from Packet Broker…' : 'Explore live Packet Broker gateways around the world.'}
          </p>
          <button
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] transition ${
              isDark ? 'border-white/20 text-slate-200 hover:border-white/40' : 'border-slate-300 text-slate-600 hover:border-slate-500'
            }`}
            onClick={toggleTheme}
          >
            {isDark ? (
              <>
                <FiSun /> Light
              </>
            ) : (
              <>
                <FiMoon /> Dark
              </>
            )}
          </button>
        </div>
        <LocationSearch onSelect={handleSearchSelect} theme={theme} />
      </div>
      <div className="absolute inset-0">
        <MapView
          gateways={toggleAllOff ? [] : (visibleGateways as Gateway[])}
          focusPoint={focusPoint}
          onFocusConsumed={() => setFocusPoint(null)}
          onGatewaySelect={handleGatewaySelect}
          theme={theme}
        />
        <div
          className={`pointer-events-auto absolute bottom-6 left-6 flex max-w-4xl flex-nowrap items-center gap-3 overflow-x-auto rounded-full border px-4 py-3 text-xs ${
            isDark ? 'border-white/10 bg-[#050914]/85 text-slate-300' : 'border-slate-200 bg-white/95 text-slate-600 shadow-lg'
          }`}
        >
          <LegendSummary
            color="#47e7ff"
            label="The Things Stack"
            count={formatNumber(ttnCount)}
            description="TTN + TTNv2"
            isDark={isDark}
          />
          <LegendSummary
            color="#ff9db9"
            label="Private network"
            count={formatNumber(privateCount)}
            description="Other Packet Broker participants"
            isDark={isDark}
          />
          <InfoPill label="Online gateways" value={formatNumber(onlineGateways.length)} isDark={isDark} />
          {error && (
            <span className={`rounded-full px-3 py-1 ${isDark ? 'bg-red-500/20 text-red-200' : 'bg-red-100 text-red-500'}`}>
              {error}
            </span>
          )}
        </div>
      </div>
      {loading && <LoadingOverlay isDark={isDark} />}
      {selectedGateway && (
        <GatewayModal gateway={selectedGateway} onClose={() => setSelectedGateway(null)} theme={theme} />
      )}
    </div>
  );
};

const GatewayDetails = ({ gateway, theme }: { gateway: Gateway; theme: 'dark' | 'light' }) => {
  const isDark = theme === 'dark';
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
    <div className="mt-5 space-y-5 text-sm">
      <SectionGrid title="Identity" items={detailItems} theme={theme} />
      <SectionGrid title="Location" items={locationItems} theme={theme} />
      <SectionGrid
        title="Status"
        items={[
          { label: 'Online state', value: gateway.online ? 'Online in Packet Broker' : 'Offline' },
          { label: 'Last updated', value: new Date(gateway.updatedAt).toLocaleString() },
          { label: 'Antenna placement', value: antenna },
        ]}
        theme={theme}
      />
    </div>
  );
};

const SectionGrid = ({ title, items, theme }: { title: string; items: { label: string; value: string }[]; theme: 'dark' | 'light' }) => {
  const isDark = theme === 'dark';
  return (
    <div>
      <p className={`text-xs uppercase tracking-[0.4em] ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{title}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl px-5 py-4 ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`}
          >
            <p className={`text-[0.65rem] uppercase tracking-[0.3em] ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
              {item.label}
            </p>
            <p className="mt-2 break-words text-base">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const LegendSummary = ({
  color,
  label,
  count,
  description,
  isDark,
}: {
  color: string;
  label: string;
  count: string;
  description: string;
  isDark: boolean;
}) => (
  <div className={`flex flex-shrink-0 items-center gap-3 rounded-full px-3 py-2 ${isDark ? 'bg-white/5 text-white' : 'bg-slate-200/80 text-slate-900'}`}>
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-sm font-medium">{label}</span>
    </div>
    <div>
      <p className="font-display text-sm">{count}</p>
      <p className={`text-[0.6rem] uppercase tracking-[0.3em] ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{description}</p>
    </div>
  </div>
);

const InfoPill = ({ label, value, isDark }: { label: string; value: string; isDark: boolean }) => (
  <div className={`flex-shrink-0 rounded-full px-3 py-2 ${isDark ? 'bg-white/5 text-white' : 'bg-slate-200/80 text-slate-900'}`}>
    <p className={`text-[0.6rem] uppercase tracking-[0.3em] ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{label}</p>
    <p className="text-sm font-medium">{value}</p>
  </div>
);

const LoadingOverlay = ({ isDark }: { isDark: boolean }) => (
  <div
    className={`pointer-events-auto absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 text-center ${
      isDark ? 'bg-[#050914]/90 text-white' : 'bg-white/80 text-slate-900'
    }`}
  >
    <FiRefreshCcw className={`text-3xl animate-spin ${isDark ? 'text-white' : 'text-slate-700'}`} />
    <p className="font-display text-xl">Fetching live gateway data…</p>
    <p className={`max-w-sm text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
      Hang tight while we synchronize with Packet Broker.
    </p>
  </div>
);

const GatewayModal = ({ gateway, onClose, theme }: { gateway: Gateway; onClose: () => void; theme: 'dark' | 'light' }) => (
  <div className={`pointer-events-auto fixed inset-0 z-40 flex items-center justify-center p-6 ${theme === 'dark' ? 'bg-black/70' : 'bg-black/20'}`}>
    <div className={`glass-panel relative w-full max-w-3xl rounded-3xl p-8 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
      <button
        className={`absolute right-6 top-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] transition ${
          theme === 'dark' ? 'border-white/20 text-slate-200 hover:border-white/40' : 'border-slate-300 text-slate-600 hover:border-slate-500'
        }`}
        onClick={onClose}
      >
        Close
      </button>
      <h2 className="font-display text-2xl">Gateway details</h2>
      <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} text-sm`}>
        Full telemetry as reported by Packet Broker
      </p>
      <GatewayDetails gateway={gateway} theme={theme} />
    </div>
  </div>
);

export default App;
