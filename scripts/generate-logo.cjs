const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

/**
 * Renders the authoritative STREAK logo matching the user's uploaded reference:
 * - 3D glossy toroidal ring
 * - Pitch black inner core (#000000)
 * - Gradient from neon lime green (left, ~260°) -> electric cyan (bottom, ~180°) ->
 *   deep sky/royal blue (right, ~90°) -> rich violet/purple (top-right, ~35°) ->
 *   rounded cyan/violet cap at ~10°
 * - Dark glassy connector channel between green cap and top cap (top-left, ~270° to ~360°)
 * - High-specular glossy 3D tubular lighting & soft ambient drop shadow
 */
function renderStreakLogo(size) {
  const png = new PNG({ width: size, height: size });
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 512;

  const R_center = 155 * scale;
  const r_tube = 42 * scale;
  const r_inner_core = 113 * scale;

  // Cap positions in radians (clockwise from 12 o'clock: 0 = 12h, PI/2 = 3h, PI = 6h, 3*PI/2 = 9h)
  // Green cap at ~265 degrees (left, just below 9 o'clock)
  const capGreenDeg = 265;
  const capGreenAngle = (capGreenDeg * Math.PI) / 180;

  // Top cap at ~15 degrees (just past 12 o'clock on right)
  const capTopDeg = 15;
  const capTopAngle = (capTopDeg * Math.PI) / 180;

  const capGreenX = cx + R_center * Math.sin(capGreenAngle);
  const capGreenY = cy - R_center * Math.cos(capGreenAngle);

  const capTopX = cx + R_center * Math.sin(capTopAngle);
  const capTopY = cy - R_center * Math.cos(capTopAngle);

  // Light source (from upper left)
  const lx = -0.42, ly = -0.52, lz = 0.74;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = x - cx;
      const dy = y - cy;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);

      // Angle clockwise from 12 o'clock in degrees [0, 360)
      let angleRad = Math.atan2(dx, -dy);
      if (angleRad < 0) angleRad += 2 * Math.PI;
      const angleDeg = (angleRad * 180) / Math.PI;

      const distToRingCenter = Math.abs(distFromCenter - R_center);
      const distToGreenCap = Math.sqrt((x - capGreenX) ** 2 + (y - capGreenY) ** 2);
      const distToTopCap = Math.sqrt((x - capTopX) ** 2 + (y - capTopY) ** 2);

      // Check if inside the main colored tube:
      // Sweeps backwards (counter-clockwise) from capGreenDeg (265°) down to capTopDeg (15°):
      // i.e., 15° <= angleDeg <= 265°
      const inMainArc = angleDeg >= capTopDeg && angleDeg <= capGreenDeg;

      // Dark connector segment in the gap between capGreenDeg and capTopDeg:
      // i.e., angleDeg > 265° or angleDeg < 15°
      const inDarkConnector = !inMainArc;

      let inTube = false;
      let d_tube = 999;
      let isCap = false;
      let isGreenCap = false;
      let isTopCap = false;
      let capNx = 0, capNy = 0;
      let isConnector = false;

      // Main colored arc check
      if (inMainArc && distToRingCenter <= r_tube) {
        inTube = true;
        d_tube = distToRingCenter;
      }

      // Check caps
      if (distToGreenCap <= r_tube) {
        if (!inTube || distToGreenCap < d_tube) {
          inTube = true;
          d_tube = distToGreenCap;
          isCap = true;
          isGreenCap = true;
          capNx = (x - capGreenX) / r_tube;
          capNy = (y - capGreenY) / r_tube;
        }
      }

      if (distToTopCap <= r_tube) {
        if (!inTube || distToTopCap < d_tube) {
          inTube = true;
          d_tube = distToTopCap;
          isCap = true;
          isTopCap = true;
          capNx = (x - capTopX) / r_tube;
          capNy = (y - capTopY) / r_tube;
        }
      }

      // Dark connector channel behind/underneath
      if (!inTube && inDarkConnector && distToRingCenter <= r_tube) {
        inTube = true;
        isConnector = true;
        d_tube = distToRingCenter;
      }

      // If outside all tube geometry
      if (!inTube) {
        // Inner black core
        if (distFromCenter <= r_inner_core) {
          png.data[idx] = 0;
          png.data[idx + 1] = 0;
          png.data[idx + 2] = 0;
          png.data[idx + 3] = 255;
          continue;
        }

        // Ambient dark drop shadow outside the ring
        let shadowAlpha = 0;
        const outerShadowLimit = R_center + r_tube + 24 * scale;
        if (distFromCenter > R_center + r_tube && distFromCenter < outerShadowLimit) {
          const sDist = distFromCenter - (R_center + r_tube);
          shadowAlpha = Math.max(0, 1 - sDist / (24 * scale)) * 0.28;
        } else if (distFromCenter < R_center - r_tube && distFromCenter > r_inner_core) {
          const sDist = R_center - r_tube - distFromCenter;
          shadowAlpha = Math.max(0, 1 - sDist / (12 * scale)) * 0.35;
        }

        if (shadowAlpha > 0) {
          png.data[idx] = 4;
          png.data[idx + 1] = 8;
          png.data[idx + 2] = 14;
          png.data[idx + 3] = Math.round(shadowAlpha * 255);
        } else {
          png.data[idx] = 0;
          png.data[idx + 1] = 0;
          png.data[idx + 2] = 0;
          png.data[idx + 3] = 0;
        }
        continue;
      }

      // Anti-aliasing at outer edge of tube
      const edgeDist = r_tube - d_tube;
      const aaAlpha = Math.min(1, Math.max(0, edgeDist / 1.5));

      // Calculate 3D surface normal
      let nx, ny, nz;
      if (isCap) {
        const rad = Math.min(1, d_tube / r_tube);
        nz = Math.sqrt(Math.max(0, 1 - rad * rad));
        nx = capNx;
        ny = capNy;
      } else {
        const radialDist = distFromCenter - R_center;
        const rad = Math.max(-1, Math.min(1, radialDist / r_tube));
        nz = Math.sqrt(Math.max(0, 1 - rad * rad));
        const cosA = dx / distFromCenter;
        const sinA = dy / distFromCenter;
        nx = cosA * rad;
        ny = sinA * rad;
      }

      // Phong Lighting calculation
      const NdotL = Math.max(0, nx * lx + ny * ly + nz * lz);
      const hx = lx, hy = ly, hz = lz + 1.0;
      const hLen = Math.sqrt(hx * hx + hy * hy + hz * hz);
      const NdotH = Math.max(0, (nx * hx + ny * hy + nz * hz) / hLen);
      const specular = Math.pow(NdotH, 28) * 0.92;
      const ambient = isConnector ? 0.25 : 0.60;
      const diffuse = isConnector ? 0.35 : 0.40;
      const lighting = ambient + diffuse * NdotL;

      let r, g, b;

      if (isConnector) {
        // Dark metallic teal/navy connector tube
        r = 8;
        g = 22;
        b = 36;
      } else {
        // Parameter t runs from 0.0 at capGreenDeg (265°) to 1.0 at capTopDeg (15°)
        // Sweeping counter-clockwise: 265° -> 180° -> 90° -> 15°
        let effectiveDeg = angleDeg;
        if (isGreenCap) effectiveDeg = capGreenDeg;
        if (isTopCap) effectiveDeg = capTopDeg;

        // t: 0.0 (Green cap) -> 1.0 (Top Cyan/Purple cap)
        const t = Math.max(0, Math.min(1, (capGreenDeg - effectiveDeg) / (capGreenDeg - capTopDeg)));

        // Gradient color stops:
        // t = 0.00: Vibrant Lime Green [#8cee28] (140, 238, 40)
        // t = 0.32: Emerald Cyan [#14d8b4] (20, 216, 180)
        // t = 0.55: Electric Cyan [#00e5ff] (0, 229, 255)
        // t = 0.78: Deep Sky Blue [#2979ff] (41, 121, 255)
        // t = 0.92: Violet / Purple [#8a3ffc] (138, 63, 252)
        // t = 1.00: Glowing Cyan Tip of Top Cap [#38bdf8] (56, 189, 248)
        if (t < 0.32) {
          const f = t / 0.32;
          r = 140 + (20 - 140) * f;
          g = 238 + (216 - 238) * f;
          b = 40 + (180 - 40) * f;
        } else if (t < 0.55) {
          const f = (t - 0.32) / 0.23;
          r = 20 + (0 - 20) * f;
          g = 216 + (229 - 216) * f;
          b = 180 + (255 - 180) * f;
        } else if (t < 0.78) {
          const f = (t - 0.55) / 0.23;
          r = 0 + (41 - 0) * f;
          g = 229 + (121 - 229) * f;
          b = 255 + (255 - 255) * f;
        } else if (t < 0.92) {
          const f = (t - 0.78) / 0.14;
          r = 41 + (138 - 41) * f;
          g = 121 + (63 - 121) * f;
          b = 255 + (252 - 255) * f;
        } else {
          const f = (t - 0.92) / 0.08;
          r = 138 + (56 - 138) * f;
          g = 63 + (189 - 63) * f;
          b = 252 + (248 - 252) * f;
        }
      }

      // Apply 3D tubular lighting & specular highlights
      let finalR = Math.min(255, Math.round(r * lighting + specular * 255));
      let finalG = Math.min(255, Math.round(g * lighting + specular * 255));
      let finalB = Math.min(255, Math.round(b * lighting + specular * 255));

      // Fresnel rim glow
      const fresnel = Math.pow(1 - Math.max(0, nz), 2) * (isConnector ? 0.15 : 0.22);
      finalR = Math.min(255, Math.round(finalR + fresnel * 100));
      finalG = Math.min(255, Math.round(finalG + fresnel * 180));
      finalB = Math.min(255, Math.round(finalB + fresnel * 255));

      png.data[idx] = finalR;
      png.data[idx + 1] = finalG;
      png.data[idx + 2] = finalB;
      png.data[idx + 3] = Math.round(aaAlpha * 255);
    }
  }

  return png;
}

// Generate all standard PWA and app sizes
const sizes = [
  { file: 'public/logo.png', size: 512 },
  { file: 'public/icon-512.png', size: 512 },
  { file: 'public/icon-maskable-512.png', size: 512 },
  { file: 'public/apple-touch-icon.png', size: 180 },
  { file: 'public/icon-192.png', size: 192 },
  { file: 'public/icon-maskable-192.png', size: 192 },
  { file: 'public/icon-144.png', size: 144 },
  { file: 'public/icon-96.png', size: 96 },
  { file: 'public/icon-48.png', size: 48 },
];

for (const { file, size } of sizes) {
  const png = renderStreakLogo(size);
  fs.writeFileSync(file, PNG.sync.write(png));
  console.log(`Generated ${file} (${size}x${size})`);
}
