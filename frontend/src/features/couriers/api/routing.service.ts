export type RoutingPoint = { lat: number; lng: number };

export interface RoutedPath {
  points: RoutingPoint[];
  distanceMeters: number;
  durationSeconds: number;
}

interface OsrmRouteResponse {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry: {
      coordinates: [number, number][];
    };
  }>;
}

const DEFAULT_ROUTING_BASE_URL = "https://router.project-osrm.org";
const ROUTE_TIMEOUT_MS = 8_000;

export async function getShortestDrivingRoute(
  origin: RoutingPoint,
  destination: RoutingPoint,
  signal?: AbortSignal
): Promise<RoutedPath> {
  const baseUrl =
    process.env.NEXT_PUBLIC_ROUTING_BASE_URL || DEFAULT_ROUTING_BASE_URL;
  const url = new URL(
    `/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`,
    baseUrl
  );
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("alternatives", "true");

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ROUTE_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Routing service returned HTTP ${response.status}.`);
    }

    const result = (await response.json()) as OsrmRouteResponse;
    if (result.code !== "Ok" || result.routes.length === 0) {
      throw new Error("The routing service did not return a route.");
    }

    const shortest = result.routes.reduce((best, route) =>
      route.distance < best.distance ? route : best
    );
    const points = shortest.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
    if (points.length < 2) throw new Error("The routing service returned an empty route.");

    return {
      points,
      distanceMeters: shortest.distance,
      durationSeconds: shortest.duration,
    };
  } catch (error) {
    if (timedOut) throw new Error("The routing request timed out after 8 seconds.");
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
