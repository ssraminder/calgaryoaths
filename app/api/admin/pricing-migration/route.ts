import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * Pricing migration: raises vendor rates to market-minimum benchmarks.
 *
 * GET  → dry-run: shows what would change
 * POST → execute: applies the changes
 *
 * Target minimums (in cents):
 *   certified-true-copy / true-copy-attestation → 3500
 *   statutory-declaration                       → 4500
 *   guarantor-declaration                       → 4000
 *   insurance-claim-declaration                 → 4000
 *   general-consent-letter                      → 4000
 *   power-of-attorney                           → 8000
 *   document-drafting                           → 12000 (per-hour)
 */

const TARGET_MINIMUMS: Record<string, number> = {
  'certified-true-copy': 3500,
  'true-copy-attestation': 3500,
  'statutory-declaration': 4500,
  'guarantor-declaration': 4000,
  'insurance-claim-declaration': 4000,
  'general-consent-letter': 4000,
  'power-of-attorney': 8000,
  'document-drafting': 12000,
};

// Slugs that should be merged into certified-true-copy
const MERGE_SOURCE = 'true-copy-attestation';
const MERGE_TARGET = 'certified-true-copy';

type ChangeLog = {
  action: string;
  table: string;
  details: Record<string, unknown>;
};

async function buildChanges() {
  const changes: ChangeLog[] = [];

  // 1. Check if merge is needed
  const { data: mergeSource } = await supabaseAdmin
    .from('co_services')
    .select('slug, name')
    .eq('slug', MERGE_SOURCE)
    .single();

  const { data: mergeTarget } = await supabaseAdmin
    .from('co_services')
    .select('slug, name')
    .eq('slug', MERGE_TARGET)
    .single();

  if (mergeSource && mergeTarget) {
    changes.push({
      action: 'merge_service',
      table: 'co_services',
      details: {
        from: MERGE_SOURCE,
        to: MERGE_TARGET,
        description: `Merge "${mergeSource.name}" into "${mergeTarget.name}"`,
      },
    });
  } else if (mergeSource && !mergeTarget) {
    changes.push({
      action: 'rename_service',
      table: 'co_services',
      details: {
        from: MERGE_SOURCE,
        to: MERGE_TARGET,
        description: `Rename "${mergeSource.name}" to "Certified True Copy" with slug "${MERGE_TARGET}"`,
      },
    });
  }

  // 2. Check vendor rates that need raising
  const targetSlugs = Object.keys(TARGET_MINIMUMS);
  const { data: rates } = await supabaseAdmin
    .from('co_vendor_rates')
    .select('*')
    .in('service_slug', targetSlugs);

  for (const rate of rates ?? []) {
    const minimum = TARGET_MINIMUMS[rate.service_slug];
    if (minimum && rate.first_page_cents < minimum) {
      changes.push({
        action: 'raise_vendor_rate',
        table: 'co_vendor_rates',
        details: {
          commissioner_id: rate.commissioner_id,
          service_slug: rate.service_slug,
          current_cents: rate.first_page_cents,
          new_cents: minimum,
          current_dollars: `$${(rate.first_page_cents / 100).toFixed(0)}`,
          new_dollars: `$${(minimum / 100).toFixed(0)}`,
        },
      });
    }
  }

  // 3. Check co_services.price that needs updating to match new minimums
  const { data: services } = await supabaseAdmin
    .from('co_services')
    .select('slug, name, price')
    .in('slug', targetSlugs);

  for (const svc of services ?? []) {
    const minimum = TARGET_MINIMUMS[svc.slug];
    if (minimum && svc.price != null && svc.price < minimum) {
      changes.push({
        action: 'raise_service_base_price',
        table: 'co_services',
        details: {
          slug: svc.slug,
          name: svc.name,
          current_cents: svc.price,
          new_cents: minimum,
          current_dollars: `$${(svc.price / 100).toFixed(0)}`,
          new_dollars: `$${(minimum / 100).toFixed(0)}`,
        },
      });
    }
  }

  return changes;
}

export async function GET(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const changes = await buildChanges();
  return NextResponse.json({
    mode: 'dry-run',
    total_changes: changes.length,
    changes,
  });
}

export async function POST(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const changes = await buildChanges();
  const results: { action: string; success: boolean; error?: string }[] = [];

  for (const change of changes) {
    try {
      switch (change.action) {
        case 'merge_service': {
          // Migrate vendor rates from source to target
          await supabaseAdmin
            .from('co_vendor_rates')
            .update({ service_slug: MERGE_TARGET })
            .eq('service_slug', MERGE_SOURCE);
          // Migrate commissioner_services links
          await supabaseAdmin
            .from('co_commissioner_services')
            .update({ service_slug: MERGE_TARGET })
            .eq('service_slug', MERGE_SOURCE);
          // Deactivate the source service
          await supabaseAdmin
            .from('co_services')
            .update({ active: false })
            .eq('slug', MERGE_SOURCE);
          results.push({ action: 'merge_service', success: true });
          break;
        }
        case 'rename_service': {
          await supabaseAdmin
            .from('co_services')
            .update({
              slug: MERGE_TARGET,
              name: 'Certified True Copy',
            })
            .eq('slug', MERGE_SOURCE);
          // Also update references
          await supabaseAdmin
            .from('co_vendor_rates')
            .update({ service_slug: MERGE_TARGET })
            .eq('service_slug', MERGE_SOURCE);
          await supabaseAdmin
            .from('co_commissioner_services')
            .update({ service_slug: MERGE_TARGET })
            .eq('service_slug', MERGE_SOURCE);
          results.push({ action: 'rename_service', success: true });
          break;
        }
        case 'raise_vendor_rate': {
          const d = change.details;
          const { error } = await supabaseAdmin
            .from('co_vendor_rates')
            .update({ first_page_cents: d.new_cents as number })
            .eq('commissioner_id', d.commissioner_id as string)
            .eq('service_slug', d.service_slug as string);
          results.push({
            action: `raise_vendor_rate:${d.commissioner_id}/${d.service_slug}`,
            success: !error,
            error: error?.message,
          });
          break;
        }
        case 'raise_service_base_price': {
          const d = change.details;
          const { error } = await supabaseAdmin
            .from('co_services')
            .update({
              price: d.new_cents as number,
            })
            .eq('slug', d.slug as string);
          results.push({
            action: `raise_service_base_price:${d.slug}`,
            success: !error,
            error: error?.message,
          });
          break;
        }
      }
    } catch (err) {
      results.push({
        action: change.action,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // Verify: read back all affected rates
  const targetSlugs = Object.keys(TARGET_MINIMUMS);
  const { data: verifyRates } = await supabaseAdmin
    .from('co_vendor_rates')
    .select('commissioner_id, service_slug, first_page_cents')
    .in('service_slug', targetSlugs);

  const { data: verifyServices } = await supabaseAdmin
    .from('co_services')
    .select('slug, name, price')
    .in('slug', targetSlugs)
    .eq('active', true);

  return NextResponse.json({
    mode: 'executed',
    results,
    verification: {
      vendor_rates: verifyRates,
      services: verifyServices,
    },
  });
}
