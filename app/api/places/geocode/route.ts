import { NextRequest, NextResponse } from 'next/server';

/**
 * Geocode an address or Place ID → returns lat/lng, formatted address,
 * and pre-built Google Maps embed + link URLs.
 *
 * GET /api/places/geocode?placeId=ChIJ...
 * GET /api/places/geocode?address=421+7th+Ave+SW+Calgary
 */
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId');
  const address = req.nextUrl.searchParams.get('address');

  if (!placeId && !address) {
    return NextResponse.json({ error: 'Provide placeId or address' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
  }

  try {
    // If we have a placeId, use Place Details (New) to get full info
    if (placeId) {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?languageCode=en`,
        {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'formattedAddress,location,addressComponents',
          },
        }
      );
      const data = await res.json();

      if (!data.location) {
        return NextResponse.json({ error: 'Place not found' }, { status: 404 });
      }

      const formattedAddress = data.formattedAddress ?? '';
      const lat = data.location.latitude;
      const lng = data.location.longitude;
      const encodedAddr = encodeURIComponent(formattedAddress);

      return NextResponse.json({
        formattedAddress,
        lat,
        lng,
        googleMapsEmbed: `https://maps.google.com/maps?q=${encodedAddr}&output=embed`,
        mapUrl: `https://maps.google.com/maps?q=${encodedAddr}`,
        addressComponents: data.addressComponents ?? [],
      });
    }

    // Fallback: use Geocoding API with raw address string
    const params = new URLSearchParams({
      address: address!,
      key: apiKey,
      region: 'ca',
    });

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`
    );
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.[0]) {
      return NextResponse.json({ error: 'Address not found', status: data.status }, { status: 404 });
    }

    const result = data.results[0];
    const formattedAddress = result.formatted_address;
    const lat = result.geometry.location.lat;
    const lng = result.geometry.location.lng;
    const encodedAddr = encodeURIComponent(formattedAddress);

    return NextResponse.json({
      formattedAddress,
      lat,
      lng,
      googleMapsEmbed: `https://maps.google.com/maps?q=${encodedAddr}&output=embed`,
      mapUrl: `https://maps.google.com/maps?q=${encodedAddr}`,
      placeId: result.place_id,
      addressComponents: result.address_components ?? [],
    });
  } catch (err) {
    console.error('Geocode error:', err);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}
