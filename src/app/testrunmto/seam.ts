/**
 * Single source of truth for the MTO Readiness Hero stage geometry.
 * All seam coordinates, panel clip paths, photo clip, glass strip lean,
 * and right-column x0 derive from these equations.
 */

export const STAGE_WIDTH = 1360;
export const STAGE_HEIGHT = 640;
export const SEAM_DEG = 8;
export const SEAM_RAD = (SEAM_DEG * Math.PI) / 180;
export const SEAM_TAN = Math.tan(SEAM_RAD); // ≈ 0.1405408347
export const SEAM_MID = 0.63 * STAGE_WIDTH; // 856.8px (63% of stage width at mid-height)

/**
 * Returns the exact horizontal seam position at vertical offset y.
 * seamX(y) = SEAM_MID + (H / 2 - y) * tan(8deg)
 */
export function seamX(y: number): number {
  return SEAM_MID + (STAGE_HEIGHT / 2 - y) * SEAM_TAN;
}

export const SEAM_TOP_X = seamX(0); // ≈ 901.77px
export const SEAM_BOTTOM_X = seamX(STAGE_HEIGHT); // ≈ 811.83px
export const SEAM_DELTA_X = SEAM_TOP_X - SEAM_BOTTOM_X; // ≈ 89.95px

/**
 * Right column left anchor x0 derived strictly as seamX(48) + 40
 * (≈ 935px on the 1360px stage).
 */
export const RIGHT_COLUMN_X0 = seamX(48) + 40; // ≈ 935.03px
export const RIGHT_COLUMN_RIGHT = STAGE_WIDTH - 40; // 1320px
export const RIGHT_COLUMN_WIDTH = RIGHT_COLUMN_RIGHT - RIGHT_COLUMN_X0; // ≈ 384.97px (at least 380px)

/**
 * CSS clip-path polygon strings derived directly from seam coordinates.
 */
export const LEFT_PANEL_CLIP = `polygon(0 0, ${SEAM_TOP_X.toFixed(2)}px 0, ${SEAM_BOTTOM_X.toFixed(2)}px 100%, 0 100%)`;
export const RIGHT_PANEL_CLIP = `polygon(${SEAM_TOP_X.toFixed(2)}px 0, 100% 0, 100% 100%, ${SEAM_BOTTOM_X.toFixed(2)}px 100%)`;
export const PHOTO_CLIP = LEFT_PANEL_CLIP;

/**
 * Lean delta for a 640px height parallelogram at 8 degrees.
 */
export const GLASS_SLANT_PX = STAGE_HEIGHT * SEAM_TAN; // ≈ 89.95px
