import { getUnassignedParcels } from "../api/dispatcher.api";
import { mapUnassignedParcelList } from "../api/dispatcher.mappers";
import { UnassignedParcelsView } from "./UnassignedParcelsView";

/**
 * Async server component that fetches initial unassigned parcels list.
 * Wrapped in Suspense by the page route with loading skeleton.
 */
export async function UnassignedParcelsData() {
  const listDto = await getUnassignedParcels({ limit: 10, offset: 0 });
  const initialData = mapUnassignedParcelList(listDto);

  return <UnassignedParcelsView initialData={initialData} />;
}

