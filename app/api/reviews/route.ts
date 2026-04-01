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
  displayName?: { text: string };
};

type ParsedReview = {
  author: string;
  authorPhoto: string | null;
  authorUrl: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
  location: string;
};

/**
 * GET /api/reviews
 * Fetches Google reviews from one or more business profiles.
 *
 * Env vars:
 *   GOOGLE_PLACE_ID   — primary Place ID (required or auto-discovered)
 *   GOOGLE_PLACE_ID_2 — second Place ID (optional, for second location)
 *
 * Reviews from both locations are merged and sorted by publish time.
 */
async function fetchPlaceReviews(
  placeId: string,
  apiKey: string
): Promise<{ data: PlaceDetailsResponse | null; locationName: string }> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?languageCode=en`,
    {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'displayName,rating,userRatingCount,reviews,googleMapsUri',
      },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    console.error(`Places API error for ${placeId}:`, res.status);
    return { data: null, locationName: '' };
  }

  const data: PlaceDetailsResponse = await res.json();
  return { data, locationName: data.displayName?.text || '' };
}

export async function GET() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
  }

  // Collect Place IDs — primary + optional second location
  const placeIds: string[] = [];

  if (process.env.GOOGLE_PLACE_ID) {
    placeIds.push(process.env.GOOGLE_PLACE_ID);
  } else {
    // Auto-discover primary Place ID via search
    const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id',
      },
      body: JSON.stringify({
        textQuery: 'Calgary Oaths Commissioner for Oaths Notary Public Calgary AB',
        locationBias: {
          circle: { center: { latitude: 51.0447, longitude: -114.0719 }, radiusMeters: 50000 },
        },
      }),
    });
    const searchData = await searchRes.json();
    const found = searchData.places?.[0]?.id;
    if (found) {
      console.log(`[Reviews] Found Google Place ID: ${found} — set GOOGLE_PLACE_ID env var`);
      placeIds.push(found);
    }
  }

  if (process.env.GOOGLE_PLACE_ID_2) {
    placeIds.push(process.env.GOOGLE_PLACE_ID_2);
  }

  console.log(`[Reviews] Fetching reviews from ${placeIds.length} place(s):`, placeIds);

  if (placeIds.length === 0) {
    return NextResponse.json({ error: 'Could not find business on Google' }, { status: 404 });
  }

  // Fetch reviews from all locations in parallel
  const results = await Promise.all(
    placeIds.map((id) => fetchPlaceReviews(id, apiKey))
  );

  // Merge reviews from all locations
  for (const { data, locationName } of results) {
    console.log(`[Reviews] ${locationName}: ${data?.userRatingCount ?? 0} reviews, rating ${data?.rating ?? 'N/A'}, got ${data?.reviews?.length ?? 0} review texts`);
  }
  const allReviews: ParsedReview[] = [];
  let totalReviewCount = 0;
  let weightedRatingSum = 0;
  let totalRatingWeight = 0;
  let primaryMapsUrl: string | null = null;

  for (const { data, locationName } of results) {
    if (!data) continue;

    if (!primaryMapsUrl && data.googleMapsUri) {
      primaryMapsUrl = data.googleMapsUri;
    }

    if (data.userRatingCount) {
      totalReviewCount += data.userRatingCount;
    }
    if (data.rating && data.userRatingCount) {
      weightedRatingSum += data.rating * data.userRatingCount;
      totalRatingWeight += data.userRatingCount;
    }

    for (const r of data.reviews ?? []) {
      allReviews.push({
        author: r.authorAttribution.displayName,
        authorPhoto: r.authorAttribution.photoUri || null,
        authorUrl: r.authorAttribution.uri || null,
        rating: r.rating,
        text: r.text?.text || '',
        relativeTime: r.relativePublishTimeDescription,
        publishTime: r.publishTime,
        location: locationName,
      });
    }
  }

  // Sort by publish time (newest first), deduplicate by author name
  allReviews.sort((a, b) => new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime());
  const seen = new Set<string>();
  const dedupedReviews = allReviews.filter((r) => {
    if (seen.has(r.author)) return false;
    seen.add(r.author);
    return true;
  });

  const combinedRating = totalRatingWeight > 0
    ? Math.round((weightedRatingSum / totalRatingWeight) * 10) / 10
    : null;

  return NextResponse.json({
    rating: combinedRating,
    totalReviews: totalReviewCount,
    googleMapsUrl: primaryMapsUrl,
    reviews: dedupedReviews,
  });
}
