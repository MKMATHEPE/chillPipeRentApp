const ORIGIN =
  'Bel Aire, Langeveld Street, Vorna Valley, Johannesburg, South Africa';
// Verified map point for Bel Aire Complex on Langeveld Road. Keeping the
// origin fixed makes every quote consistent and avoids repeated geocoding.
const ORIGIN_POINT: Point = {
  lat: -26.0090511,
  lon: 28.1091262,
  label: ORIGIN,
};
const USER_AGENT =
  'TheChillPipeRentals/1.0 (+https://the-chill-pipe-rentals.mkmathepe.chatgpt.site)';

type Point = { lat: number; lon: number; label: string; suburb?: string };

const json = (data: unknown, status = 200) => Response.json(data, { status });

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Map service returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function geocode(address: string): Promise<Point | null> {
  const query = new URLSearchParams({
    q: address,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'za',
  });
  const results = (await fetchJson(
    `https://nominatim.openstreetmap.org/search?${query}`,
  )) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!results[0]) return null;
  return {
    lat: Number(results[0].lat),
    lon: Number(results[0].lon),
    label: results[0].display_name,
  };
}

async function reverseGeocode(lat: number, lon: number) {
  const query = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
    zoom: '18',
  });
  const result = (await fetchJson(
    `https://nominatim.openstreetmap.org/reverse?${query}`,
  )) as {
    display_name?: string;
    address?: {
      suburb?: string;
      neighbourhood?: string;
      city_district?: string;
      city?: string;
      town?: string;
    };
  };
  return {
    label: result.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
    suburb:
      result.address?.suburb ||
      result.address?.neighbourhood ||
      result.address?.city_district ||
      result.address?.city ||
      result.address?.town ||
      'Pinned location',
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      address?: unknown;
      latitude?: unknown;
      longitude?: unknown;
    };
    const origin = ORIGIN_POINT;

    let destination: Point | null = null;
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
        return json({ error: 'The pinned location is invalid.' }, 400);
      const pinnedAddress = await reverseGeocode(latitude, longitude);
      destination = {
        lat: latitude,
        lon: longitude,
        ...pinnedAddress,
      };
    } else {
      const address =
        typeof body.address === 'string' ? body.address.trim().slice(0, 240) : '';
      if (!address)
        return json({ error: 'Enter a delivery address first.' }, 400);
      destination = await geocode(address);
      if (!destination)
        return json(
          { error: 'We could not find that address. Add more detail and try again.' },
          404,
        );
    }

    const coordinates = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
    const route = (await fetchJson(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false&alternatives=false&steps=false`,
    )) as { code?: string; routes?: Array<{ distance: number }> };
    const metres = route.routes?.[0]?.distance;
    if (route.code !== 'Ok' || typeof metres !== 'number')
      return json({ error: 'A driving route could not be calculated.' }, 422);

    const distanceKm = Math.round((metres / 1000) * 10) / 10;
    return json({
      distanceKm,
      fee: distanceKm <= 15 ? 250 : 350,
      destinationLabel: destination.label,
      destinationSuburb: destination.suburb,
      latitude: destination.lat,
      longitude: destination.lon,
    });
  } catch (error) {
    console.error(error);
    return json(
      { error: 'Distance calculation is temporarily unavailable. Please try again.' },
      503,
    );
  }
}
