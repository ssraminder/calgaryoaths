import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

type GoogleReview = {
  name: string;
  relativePublishTimeDescription: string;
  rating: number;
  text?: { text: string; languageCode: string };
  authorAttribution: {
    displayName: string;
    uri?: string;
    photoUri?: string;
  };
  publishTime: string;
};

type PlaceDetailsResponse = {
  rating?: number;
  userRatingCount?: number;
  reviews?: GoogleReview[];
  googleMapsUri?: string;
};

/**
 * GET /api/reviews
 * Fetches Google reviews for the business using Places API (New).
 * Requires: Places API (New) enabled + GOOGLE_MAPS_API_KEY.
 *
 * Set GOOGLE_PLACE_ID in env (or co_settings) to the business Place ID.
 * If not set, searches for "Calgary Oaths" to find it.
 */
export async function GET() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
  }

  // Try env var first, then fall back to search
  let placeId = process.env.GOOGLE_PLACE_ID;

  if (!placeId) {
    // Search for the business to get Place ID
    const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id',
      },
      body: JSON.stringify({
        textQuery: 'Calgary Oaths Commissioner',
        locationBias: {
          circle: { center: { latitude: 51.0447, longitude: -114.0719 }, radiusMeters: 50000 },
        },
      }),
    });
    const searchData = await searchRes.json();
    placeId = searchData.places?.[0]?.id;

    if (!placeId) {
      return NextResponse.json({ error: 'Could not find business on Google' }, { status: 404 });
    }
  }

  // Fetch place details with reviews
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?languageCode=en`,
    {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri',
      },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('Places API error:', res.status, text);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }

  const data: PlaceDetailsResponse = await res.json();

  const reviews = (data.reviews ?? []).map((r) => ({
    author: r.authorAttribution.displayName,
    authorPhoto: r.authorAttribution.photoUri || null,
    authorUrl: r.authorAttribution.uri || null,
    rating: r.rating,
    text: r.text?.text || '',
    relativeTime: r.relativePublishTimeDescription,
    publishTime: r.publishTime,
  }));

  return NextResponse.json({
    rating: data.rating ?? null,
    totalReviews: data.userRatingCount ?? 0,
    googleMapsUrl: data.googleMapsUri ?? null,
    reviews,
  });
}
