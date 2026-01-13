/**
 * Centralized material pricing configuration (average Indian market rates).
 */

const MATERIAL_UNIT_PRICES: Record<string, number> = {
  bricks: 10, // per piece
  cement: 400, // per bag (50kg)
  'concrete mix': 6000, // per m³
  gravel: 2750, // per tonne
  sand: 3750, // per tonne
  'steel bars': 62, // per kg
  'steel bars (tmt)': 62, // alias
};

/**
 * Get average unit price for a material name (case-insensitive).
 */
export function getMaterialUnitPrice(materialName: string): number | null {
  const original = (materialName || '').trim().toLowerCase();
  if (!original) return null;

  // Exact match first
  if (MATERIAL_UNIT_PRICES[original] != null) return MATERIAL_UNIT_PRICES[original];

  // Normalize: remove punctuation, multiple spaces
  const normalize = (s: string) => s.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const norm = normalize(original);

  if (MATERIAL_UNIT_PRICES[norm] != null) return MATERIAL_UNIT_PRICES[norm];

  // Fallback: try substring / partial matches to cover pluralization and small name differences
  for (const k of Object.keys(MATERIAL_UNIT_PRICES)) {
    const kn = normalize(k);
    if (kn && (norm.includes(kn) || kn.includes(norm))) {
      return MATERIAL_UNIT_PRICES[k];
    }
    // Try removing trailing 's' from words (simple plural handling)
    const knNoS = kn.replace(/\bs\b/g, '').trim();
    const normNoS = norm.replace(/\bs\b/g, '').trim();
    if (knNoS && (normNoS.includes(knNoS) || knNoS.includes(normNoS))) {
      return MATERIAL_UNIT_PRICES[k];
    }
  }

  return null;
}
