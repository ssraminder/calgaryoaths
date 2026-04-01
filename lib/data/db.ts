import { supabase } from '@/lib/supabase';
import type { Commissioner } from '@/lib/data/commissioners';
import type { Location } from '@/lib/data/locations';

export type DbCommissioner = {
  id: string;
  name: string;
  title: string;
  location: string;
  location_slug: string;
  address: string;
  phone: string;
  email: string;
  calendly_url: string;
  languages: string[];
  credentials: string[];
  bio: string;
  nearby_neighbourhoods: string[];
  hours_weekdays: string;
  hours_saturday: string;
  hours_sunday: string;
  google_maps_embed: string;
  map_url: string;
  areas_served: string[];
  active: boolean;
  sort_order: number;
};

export type DbLocation = {
  id: string;
  name: string;
  commissioner_id: string;
  address: string;
  phone: string;
  parking_notes: string;
  nearby_neighbourhoods: string[];
  google_maps_embed: string;
  map_url: string;
  calendly_url: string;
  hours_weekdays: string;
  hours_saturday: string;
  hours_sunday: string;
  geo_lat: number;
  geo_lng: number;
  active: boolean;
  sort_order: number;
};

export type DbSettings = Record<string, string>;

export async function getCommissioners(): Promise<DbCommissioner[]> {
  const { data, error } = await supabase
    .from('co_commissioners')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to fetch commissioners:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getLocations(): Promise<DbLocation[]> {
  const { data, error } = await supabase
    .from('co_locations')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to fetch locations:', error.message);
    return [];
  }
  return data ?? [];
}

/** Map a raw DB commissioner row to the camelCase Commissioner shape used in components */
export function dbToCommissioner(row: DbCommissioner): Commissioner {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    location: row.location,
    locationSlug: row.location_slug,
    address: row.address,
    phone: row.phone,
    email: row.email,
    calendlyUrl: row.calendly_url,
    languages: row.languages ?? [],
    credentials: row.credentials ?? [],
    bio: row.bio,
    nearbyNeighbourhoods: row.nearby_neighbourhoods ?? [],
    hours: {
      weekdays: row.hours_weekdays,
      saturday: row.hours_saturday,
      sunday: row.hours_sunday,
    },
    googleMapsEmbed: row.google_maps_embed,
    mapUrl: row.map_url,
  } as unknown as Commissioner;
}

/** Map a raw DB location row to the camelCase Location shape used in components */
export function dbToLocation(row: DbLocation): Location {
  return {
    id: row.id,
    slug: row.id,
    name: row.name,
    commissionerId: row.commissioner_id,
    commissionerName: '',
    address: row.address,
    phone: row.phone,
    parking: row.parking_notes,
    nearbyNeighbourhoods: row.nearby_neighbourhoods ?? [],
    googleMapsEmbed: row.google_maps_embed,
    mapUrl: row.map_url,
    calendlyUrl: row.calendly_url,
    hours: {
      weekdays: row.hours_weekdays,
      saturday: row.hours_saturday,
      sunday: row.hours_sunday,
    },
    geo: {
      latitude: row.geo_lat,
      longitude: row.geo_lng,
    },
  } as unknown as Location;
}

export type AnalyticsSettings = {
  ga4Id: string | null;
  gtmId: string | null;
};

export async function getAnalyticsSettings(): Promise<AnalyticsSettings> {
  const settings = await getSettings();
  return {
    ga4Id: settings.ga4_id ?? null,
    gtmId: settings.gtm_id ?? null,
  };
}

export async function getSettings(): Promise<DbSettings> {
  const { data, error } = await supabase
    .from('co_settings')
    .select('key, value');

  if (error) {
    console.error('Failed to fetch settings:', error.message);
    return {};
  }
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
}
