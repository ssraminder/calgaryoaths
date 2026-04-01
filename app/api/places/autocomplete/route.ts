import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Places Autocomplete (New) — returns address suggestions.
 * GET /api/places/autocomplete?input=421+7th+Ave
 */
export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input');
  if (!input || input.length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
  }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ['ca'],
        includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'route'],
        languageCode: 'en',
      }),
    });

    const data = await res.json();

    const predictions = (data.suggestions ?? [])
      .filter((s: { placePrediction?: unknown }) => s.placePrediction)
      .map((s: { placePrediction: { placeId: string; text: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }) => ({
        placeId: s.placePrediction.placeId,
        description: s.placePrediction.text.text,
        mainText: s.placePrediction.structuredFormat?.mainText?.text ?? '',
        secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text ?? '',
      }));

    return NextResponse.json({ predictions });
  } catch (err) {
    console.error('Places Autocomplete error:', err);
    return NextResponse.json({ predictions: [], error: 'Autocomplete failed' });
  }
}
