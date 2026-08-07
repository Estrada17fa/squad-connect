import * as React from "react";

const LeafletMap = React.lazy(() => import("./LeafletMap"));

interface Props {
  latitude: number;
  longitude: number;
  draggable?: boolean;
  onMove?: (lat: number, lng: number) => void;
  className?: string;
  zoom?: number;
}

/** Envoltura del mapa: evita cargar Leaflet en el servidor. */
export function LocationMap(props: Props) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const skeleton = (
    <div className={props.className ?? "h-40 w-full rounded-xl"} style={{ background: "hsl(0 0% 10%)" }} />
  );
  if (!mounted) return skeleton;
  return (
    <React.Suspense fallback={skeleton}>
      <LeafletMap {...props} />
    </React.Suspense>
  );
}
