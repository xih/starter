"use client";

import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { ScatterplotLayer } from "@deck.gl/layers";
import DeckGL from "@deck.gl/react";
import {
  LightingEffect,
  AmbientLight,
  DirectionalLight,
  FlyToInterpolator,
  _GlobeView as GlobeView,
  type GlobeViewState,
  type PickingInfo,
} from "@deck.gl/core";
import { type DialConfig, useDialKit } from "dialkit";
import { cellToLatLng, latLngToCell } from "h3-js";
import { Map } from "react-map-gl/mapbox";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { env } from "~/env";
import { isDialKitEnabled } from "~/components/DialKitRoot";
import {
  PermanentCapitalDrawer,
  PermanentCapitalSideSheet,
} from "./PermanentCapitalInspector";
import {
  formatCompactCurrency,
  getAggregateAssets,
  getCompanyAssets,
  getMappedCompanies,
} from "./format";
import type {
  MappedPermanentCapitalCompany,
  PermanentCapitalDataset,
  PermanentCapitalSelection,
} from "./types";

const DATA_URL = "/data/permanent-capital/companies.json";
const H3_RESOLUTION = 3;
const SELECTED_FILL_COLOR = [255, 55, 55, 245] as const;
const SELECTED_LINE_COLOR = [255, 185, 185, 255] as const;
const SMOOTH_EASE = (t: number) => t * t * (3 - 2 * t);
const INITIAL_VIEW_STATE = {
  longitude: -96,
  latitude: 38.5,
  zoom: 2.55,
  maxZoom: 22,
} satisfies PermanentCapitalViewState;

const ELEVATION_CONTROLS = {
  elevationScale: [0.000025, 0, 0.0005, 0.000005],
  elevationRangeMin: [0, 0, 20000, 250],
  elevationRangeMax: [650000, 1000, 2000000, 5000],
  elevationUpperPercentile: [100, 80, 100, 0.1],
  radiusMeters: [95000, 10000, 220000, 1000],
} satisfies DialConfig;

const CAMERA_CONTROLS = {
  flyDurationMs: [1750, 1500, 2000, 50],
  flySpeed: [1.2, 0.2, 4, 0.1],
  flyCurve: [1.414, 0.5, 3, 0.05],
  hexZoom: [5.8, 3, 10, 0.1],
  companyZoom: [7.25, 4, 14, 0.1],
} satisfies DialConfig;

type ElevationControls = {
  elevationScale: number;
  elevationRangeMin: number;
  elevationRangeMax: number;
  elevationUpperPercentile: number;
  radiusMeters: number;
};

type CameraControls = {
  flyDurationMs: number;
  flySpeed: number;
  flyCurve: number;
  hexZoom: number;
  companyZoom: number;
};

const DEFAULT_ELEVATION_CONTROLS: ElevationControls = {
  elevationScale: ELEVATION_CONTROLS.elevationScale[0],
  elevationRangeMin: ELEVATION_CONTROLS.elevationRangeMin[0],
  elevationRangeMax: ELEVATION_CONTROLS.elevationRangeMax[0],
  elevationUpperPercentile: ELEVATION_CONTROLS.elevationUpperPercentile[0],
  radiusMeters: ELEVATION_CONTROLS.radiusMeters[0],
};

const DEFAULT_CAMERA_CONTROLS: CameraControls = {
  flyDurationMs: CAMERA_CONTROLS.flyDurationMs[0],
  flySpeed: CAMERA_CONTROLS.flySpeed[0],
  flyCurve: CAMERA_CONTROLS.flyCurve[0],
  hexZoom: CAMERA_CONTROLS.hexZoom[0],
  companyZoom: CAMERA_CONTROLS.companyZoom[0],
};

type PermanentCapitalHexBin = {
  hex: string;
  companies: MappedPermanentCapitalCompany[];
  totalAssets: number;
  knownAssetCount: number;
};

type SelectedFeature =
  | {
      type: "hex";
      id: string;
    }
  | {
      type: "company";
      id: string;
    };

type PermanentCapitalViewState = GlobeViewState & {};

const LIGHTING_EFFECT = new LightingEffect({
  ambientLight: new AmbientLight({
    color: [255, 255, 255],
    intensity: 1.2,
  }),
  directionalLight: new DirectionalLight({
    color: [255, 255, 255],
    intensity: 2,
    direction: [-3, -4, -6],
  }),
});

const MAP_VIEW = new GlobeView({
  id: "map",
  resolution: 2,
  nearZMultiplier: 0.02,
  farZMultiplier: 3,
});

export function PermanentCapitalMap() {
  if (isDialKitEnabled()) {
    return <PermanentCapitalMapWithDialKit />;
  }

  return (
    <PermanentCapitalMapContent
      cameraControls={DEFAULT_CAMERA_CONTROLS}
      elevationControls={DEFAULT_ELEVATION_CONTROLS}
    />
  );
}

function PermanentCapitalMapWithDialKit() {
  const elevationControls = useDialKit(
    "Permanent Capital Hexagons",
    ELEVATION_CONTROLS,
    {
      id: "permanent-capital-hexagons",
      persist: {
        key: "permanent-capital-hexagons",
        storage: "localStorage",
        presets: true,
      },
      shortcuts: {
        elevationScale: { key: "e", mode: "fine" },
        elevationRangeMax: { key: "r", mode: "coarse" },
        radiusMeters: { key: "h", mode: "coarse" },
      },
    },
  ) as ElevationControls;
  const cameraControls = useDialKit(
    "Permanent Capital Camera",
    CAMERA_CONTROLS,
    {
      id: "permanent-capital-camera",
      persist: {
        key: "permanent-capital-camera",
        storage: "localStorage",
        presets: true,
      },
      shortcuts: {
        flyDurationMs: { key: "t", mode: "coarse" },
        hexZoom: { key: "z", mode: "coarse" },
        companyZoom: { key: "x", mode: "coarse" },
      },
    },
  ) as CameraControls;

  return (
    <PermanentCapitalMapContent
      cameraControls={cameraControls}
      elevationControls={elevationControls}
    />
  );
}

function PermanentCapitalMapContent({
  cameraControls,
  elevationControls,
}: {
  cameraControls: CameraControls;
  elevationControls: ElevationControls;
}) {
  const isMobileInspector = useIsMobileInspector();
  const flyAnimationFrameRef = useRef<number | null>(null);
  const [dataset, setDataset] = useState<PermanentCapitalDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<PermanentCapitalSelection | null>(
    null,
  );
  const [selectedFeature, setSelectedFeature] =
    useState<SelectedFeature | null>(null);
  const [viewState, setViewState] =
    useState<PermanentCapitalViewState>(INITIAL_VIEW_STATE);

  useEffect(
    () => () => {
      if (flyAnimationFrameRef.current != null) {
        window.cancelAnimationFrame(flyAnimationFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;

    fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load permanent capital data.`);
        }
        return response.json() as Promise<PermanentCapitalDataset>;
      })
      .then((payload) => {
        if (active) setDataset(payload);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Data load failed.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const companies = useMemo(
    () => getMappedCompanies(dataset?.companies ?? []),
    [dataset],
  );
  const hexBins = useMemo(() => getH3HexBins(companies), [companies]);
  const maxHexAssets = useMemo(
    () => Math.max(...hexBins.map((bin) => bin.totalAssets), 1),
    [hexBins],
  );
  const elevationAssetCap = useMemo(
    () =>
      getPercentile(
        hexBins.map((bin) => bin.totalAssets),
        elevationControls.elevationUpperPercentile,
      ),
    [elevationControls.elevationUpperPercentile, hexBins],
  );

  const layers = useMemo(
    () => [
      new H3HexagonLayer<PermanentCapitalHexBin>({
        id: "permanent-capital-hexagons",
        data: hexBins,
        pickable: true,
        extruded: true,
        highPrecision: true,
        coverage: 0.9,
        opacity: 0.92,
        elevationScale: elevationControls.elevationScale,
        getHexagon: (bin) => bin.hex,
        getElevation: (bin) =>
          getClampedElevationWeight(bin, elevationControls, elevationAssetCap),
        getFillColor: (bin) =>
          isSelectedHex(bin, selectedFeature)
            ? SELECTED_FILL_COLOR
            : getHexFillColor(bin, maxHexAssets),
        material: {
          ambient: 0.45,
          diffuse: 0.55,
          shininess: 32,
          specularColor: [255, 255, 255],
        },
        transitions: {
          elevationScale: 400,
          elevationRange: 400,
        },
        updateTriggers: {
          getElevation: [
            elevationControls.elevationRangeMax,
            elevationControls.elevationRangeMin,
            elevationControls.elevationScale,
            elevationAssetCap,
          ],
          getFillColor: [
            maxHexAssets,
            selectedFeature?.type,
            selectedFeature?.id,
          ],
        },
      }),
      new ScatterplotLayer<MappedPermanentCapitalCompany>({
        id: "permanent-capital-companies",
        data: companies,
        pickable: true,
        stroked: true,
        filled: true,
        radiusUnits: "meters",
        radiusMinPixels: 4,
        radiusMaxPixels: 12,
        getRadius: (company) =>
          Math.max(
            Math.sqrt((getCompanyAssets(company) ?? 0) / 1_000_000),
            elevationControls.radiusMeters,
          ),
        getPosition: (company) => [company.longitude, company.latitude],
        getFillColor: (company) =>
          isSelectedCompany(company, selectedFeature)
            ? SELECTED_FILL_COLOR
            : [242, 245, 235, 225],
        getLineColor: (company) =>
          isSelectedCompany(company, selectedFeature)
            ? SELECTED_LINE_COLOR
            : [18, 19, 24, 220],
        lineWidthMinPixels: 1,
        updateTriggers: {
          getRadius: [elevationControls.radiusMeters],
          getFillColor: [selectedFeature?.type, selectedFeature?.id],
          getLineColor: [selectedFeature?.type, selectedFeature?.id],
        },
        parameters: {
          depthCompare: "always",
          depthWriteEnabled: false,
        },
      }),
    ],
    [
      companies,
      elevationAssetCap,
      elevationControls,
      hexBins,
      maxHexAssets,
      selectedFeature,
    ],
  );

  const selectedCompanies =
    selection?.type === "aggregate"
      ? selection.companies
      : selection?.aggregateCompanies;
  const selectCompany = (
    company: MappedPermanentCapitalCompany,
    aggregateCompanies = selectedCompanies,
  ) => {
    setSelection({
      type: "company",
      company,
      aggregateCompanies,
    });
    setSelectedFeature({ type: "company", id: company.id });
    flyToCompany(
      company,
      cameraControls,
      viewState,
      setViewState,
      flyAnimationFrameRef,
    );
  };
  const clearSelection = () => {
    setSelection(null);
    setSelectedFeature(null);
  };

  return (
    <main
      className="relative h-svh w-full overflow-hidden bg-[#07080c] text-white"
      data-map-zoom={viewState.zoom.toFixed(2)}
      data-selected-feature={
        selectedFeature
          ? `${selectedFeature.type}:${selectedFeature.id}`
          : "none"
      }
      data-selection-kind={selection?.type ?? "none"}
    >
      {env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? (
        <DeckGL
          controller
          effects={[LIGHTING_EFFECT]}
          layers={layers}
          pickingRadius={28}
          viewState={viewState}
          views={MAP_VIEW}
          getCursor={({ isDragging, isHovering }) =>
            isDragging ? "grabbing" : isHovering ? "pointer" : "grab"
          }
          onClick={(info: PickingInfo) => {
            const pickedSelection = getSelectionFromPickingInfo(info);

            if (pickedSelection == null) {
              clearSelection();
              return;
            }

            if (pickedSelection.type === "company") {
              selectCompany(pickedSelection.company, undefined);
              return;
            }

            setSelection(pickedSelection);
            const selectedHex = getSelectedHexFromPickingInfo(info);
            setSelectedFeature(
              selectedHex ? { type: "hex", id: selectedHex } : null,
            );
            flyToHexSelection(
              pickedSelection.companies,
              selectedHex,
              cameraControls,
              viewState,
              setViewState,
              flyAnimationFrameRef,
            );
          }}
          onViewStateChange={({ viewState: nextViewState }) => {
            if (flyAnimationFrameRef.current != null) {
              window.cancelAnimationFrame(flyAnimationFrameRef.current);
              flyAnimationFrameRef.current = null;
            }

            setViewState({
              longitude: nextViewState.longitude,
              latitude: nextViewState.latitude,
              zoom: nextViewState.zoom,
              maxZoom: 22,
            });
          }}
        >
          <Map
            attributionControl
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
            maxPitch={85}
            maxZoom={22}
            minZoom={0}
            projection="globe"
            renderWorldCopies={false}
            reuseMaps
          />
        </DeckGL>
      ) : (
        <div className="grid h-full place-items-center bg-[#07080c] p-token-20 text-center">
          <div className="max-w-[420px] rounded-[8px] border border-white/10 bg-[#121318] p-token-20 shadow-2xl shadow-black/30">
            <h2 className="leading-heading font-title text-heading text-white">
              Mapbox token required
            </h2>
            <p className="leading-body mt-token-8 text-body text-text-secondary">
              Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to render the permanent
              capital globe.
            </p>
          </div>
        </div>
      )}

      <div className="p-token-14 pointer-events-none absolute left-token-20 top-token-20 z-20 grid gap-token-8 rounded-[8px] border border-white/10 bg-[#121318]/80 shadow-2xl shadow-black/30 backdrop-blur-md">
        <p className="text-caption uppercase tracking-[0.08em] text-text-secondary">
          Permanent Capital
        </p>
        <h1 className="leading-heading font-title text-heading text-white">
          Closed-End Investment Companies
        </h1>
        <p className="leading-caption max-w-[320px] text-caption text-text-secondary">
          {dataset
            ? `${dataset.mappedCount} mapped companies · ${dataset.unmappedCount} unmapped · ${formatCompactCurrency(getAggregateAssets(companies))} assets`
            : "Loading company geography and assets"}
        </p>
      </div>

      {error ? (
        <div className="leading-body absolute left-1/2 top-1/2 z-20 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[8px] border border-red-400/30 bg-[#121318] p-token-20 text-body text-white shadow-2xl">
          {error}
        </div>
      ) : null}

      {isMobileInspector ? (
        <PermanentCapitalDrawer
          selection={selection}
          onClose={clearSelection}
          onSelectCompany={(company) => selectCompany(company)}
        />
      ) : (
        <PermanentCapitalSideSheet
          selection={selection}
          onClose={clearSelection}
          onSelectCompany={(company) => selectCompany(company)}
        />
      )}
    </main>
  );
}

function useIsMobileInspector() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function isSelectedHex(
  bin: PermanentCapitalHexBin,
  selectedFeature: SelectedFeature | null,
) {
  return selectedFeature?.type === "hex" && selectedFeature.id === bin.hex;
}

function isSelectedCompany(
  company: MappedPermanentCapitalCompany,
  selectedFeature: SelectedFeature | null,
) {
  return (
    selectedFeature?.type === "company" && selectedFeature.id === company.id
  );
}

function flyToCompany(
  company: MappedPermanentCapitalCompany,
  controls: CameraControls,
  currentViewState: PermanentCapitalViewState,
  setViewState: Dispatch<SetStateAction<PermanentCapitalViewState>>,
  animationFrameRef: { current: number | null },
) {
  flyToPosition(
    {
      longitude: company.longitude,
      latitude: company.latitude,
      zoom: controls.companyZoom,
    },
    controls,
    currentViewState,
    setViewState,
    animationFrameRef,
  );
}

function flyToHexSelection(
  companies: MappedPermanentCapitalCompany[],
  selectedHex: string | null,
  controls: CameraControls,
  currentViewState: PermanentCapitalViewState,
  setViewState: Dispatch<SetStateAction<PermanentCapitalViewState>>,
  animationFrameRef: { current: number | null },
) {
  const center = selectedHex
    ? getH3Center(selectedHex)
    : getCompanyCenter(companies);

  if (!center) return;

  flyToPosition(
    {
      longitude: center.longitude,
      latitude: center.latitude,
      zoom: controls.hexZoom,
    },
    controls,
    currentViewState,
    setViewState,
    animationFrameRef,
  );
}

function flyToPosition(
  target: Pick<PermanentCapitalViewState, "longitude" | "latitude" | "zoom">,
  controls: CameraControls,
  currentViewState: PermanentCapitalViewState,
  setViewState: Dispatch<SetStateAction<PermanentCapitalViewState>>,
  animationFrameRef: { current: number | null },
) {
  const duration = Math.round(controls.flyDurationMs);
  const viewportSize = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const startViewState = {
    ...viewportSize,
    longitude: currentViewState.longitude,
    latitude: currentViewState.latitude,
    zoom: currentViewState.zoom,
  };
  const endViewState = {
    ...viewportSize,
    ...target,
    zoom: Math.max(currentViewState.zoom, target.zoom),
  };
  const interpolator = new FlyToInterpolator({
    curve: controls.flyCurve,
    speed: controls.flySpeed,
  });
  const startedAt = performance.now();

  if (animationFrameRef.current != null) {
    window.cancelAnimationFrame(animationFrameRef.current);
  }

  const tick = (now: number) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const nextViewState = interpolator.interpolateProps(
      startViewState,
      endViewState,
      SMOOTH_EASE(progress),
    ) as Pick<PermanentCapitalViewState, "longitude" | "latitude" | "zoom">;

    setViewState({
      longitude: nextViewState.longitude,
      latitude: nextViewState.latitude,
      zoom: nextViewState.zoom,
      maxZoom: 22,
    });

    if (progress < 1) {
      animationFrameRef.current = window.requestAnimationFrame(tick);
    } else {
      animationFrameRef.current = null;
    }
  };

  animationFrameRef.current = window.requestAnimationFrame(tick);
}

function getH3Center(hex: string) {
  try {
    const [latitude, longitude] = cellToLatLng(hex);
    return { latitude, longitude };
  } catch {
    return null;
  }
}

function getCompanyCenter(companies: MappedPermanentCapitalCompany[]) {
  if (companies.length === 0) return null;

  const total = companies.reduce(
    (center, company) => ({
      latitude: center.latitude + company.latitude,
      longitude: center.longitude + company.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return {
    latitude: total.latitude / companies.length,
    longitude: total.longitude / companies.length,
  };
}

function isMappedCompany(
  value: unknown,
): value is MappedPermanentCapitalCompany {
  return (
    typeof value === "object" &&
    value != null &&
    "latitude" in value &&
    "longitude" in value &&
    typeof value.latitude === "number" &&
    typeof value.longitude === "number"
  );
}

function getHexagonCompanies(info: unknown) {
  if (
    isRecord(info) &&
    isRecord(info.object) &&
    Array.isArray(info.object.companies) &&
    info.object.companies.every(isMappedCompany)
  ) {
    return info.object.companies;
  }

  if (
    !isRecord(info) ||
    !isRecord(info.object) ||
    !Array.isArray(info.object.points)
  ) {
    return [];
  }

  return info.object.points
    .map((point: unknown) => getAggregatedPointSource(point))
    .filter(isMappedCompany);
}

function getSelectionFromPickingInfo(
  info: PickingInfo,
): PermanentCapitalSelection | null {
  if (isMappedCompany(info.object)) {
    return { type: "company", company: info.object };
  }

  const hexCompanies = getHexagonCompanies(info);
  if (hexCompanies.length > 0) {
    return { type: "aggregate", companies: hexCompanies };
  }

  return null;
}

function getSelectedHexFromPickingInfo(info: PickingInfo) {
  if (isRecord(info.object) && typeof info.object.hex === "string") {
    return info.object.hex;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

function getAggregatedPointSource(point: unknown) {
  if (!isRecord(point)) return point;
  return "source" in point ? point.source : point;
}

function getH3HexBins(companies: MappedPermanentCapitalCompany[]) {
  const bins = new globalThis.Map<string, PermanentCapitalHexBin>();

  for (const company of companies) {
    const hex = latLngToCell(
      company.latitude,
      company.longitude,
      H3_RESOLUTION,
    );
    const bin = bins.get(hex);
    const assets = getCompanyAssets(company);

    if (bin) {
      bin.companies.push(company);
      if (assets != null) {
        bin.totalAssets += assets;
        bin.knownAssetCount += 1;
      }
    } else {
      bins.set(hex, {
        hex,
        companies: [company],
        totalAssets: assets ?? 0,
        knownAssetCount: assets == null ? 0 : 1,
      });
    }
  }

  return [...bins.values()];
}

function getClampedElevationWeight(
  bin: PermanentCapitalHexBin,
  controls: ElevationControls,
  assetCap: number,
) {
  const safeScale = Math.max(controls.elevationScale, 0.000001);
  const cappedAssets = Math.min(bin.totalAssets, assetCap);
  const clampedMeters = Math.min(
    Math.max(cappedAssets * safeScale, controls.elevationRangeMin),
    controls.elevationRangeMax,
  );

  return clampedMeters / safeScale;
}

function getPercentile(values: number[], percentile: number) {
  const sortedValues = values
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (sortedValues.length === 0) return 1;

  const clampedPercentile = Math.min(Math.max(percentile, 0), 100);
  const index = Math.ceil((clampedPercentile / 100) * sortedValues.length) - 1;

  return sortedValues[Math.max(index, 0)] ?? sortedValues.at(-1) ?? 1;
}

function getHexFillColor(bin: PermanentCapitalHexBin, maxAssets: number) {
  if (bin.knownAssetCount === 0) {
    return [112, 120, 132, 120] as const;
  }

  const normalized = Math.min(
    Math.log10(bin.totalAssets + 1) / Math.log10(maxAssets + 1),
    1,
  );

  if (normalized > 0.92) return [255, 232, 139, 255] as const;
  if (normalized > 0.82) return [190, 231, 171, 245] as const;
  if (normalized > 0.68) return [114, 207, 184, 235] as const;
  if (normalized > 0.52) return [72, 175, 183, 215] as const;
  if (normalized > 0.36) return [68, 145, 174, 190] as const;
  return [73, 118, 151, 165] as const;
}
