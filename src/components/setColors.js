import clamp01 from "./clamp";

function hslToHex(h, s, l) {
  // Converter
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= hh && hh < 1) [r, g, b] = [c, x, 0];
  else if (1 <= hh && hh < 2) [r, g, b] = [x, c, 0];
  else if (2 <= hh && hh < 3) [r, g, b] = [0, c, x];
  else if (3 <= hh && hh < 4) [r, g, b] = [0, x, c];
  else if (4 <= hh && hh < 5) [r, g, b] = [x, 0, c];
  else if (5 <= hh && hh < 6) [r, g, b] = [c, 0, x];

  const m = l - c / 2;
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);

  return (
    "#" +
    R.toString(16).padStart(2, "0") +
    G.toString(16).padStart(2, "0") +
    B.toString(16).padStart(2, "0")
  );
}

function colorFromSeverityIntensity(severityRaw, intensityRaw) {
  const sev = String(severityRaw || "").toLowerCase();
  const i = clamp01((Number(intensityRaw) || 0) / 100); // 0..1

  // Base hue by severity
  let hue;
  if (sev === "high")
    hue = 0; // high
  else if (sev === "med" || sev === "medium")
    hue = 210; //med
  else hue = 120; // Low

  // The Higher intensity more saturated and brighter
  const sat = 60 + i * 35; // 60 t0 95 How vived
  const lightHead = 50 + i * 10; // 45 to 55 How bright
  const lightTail = Math.min(96, lightHead + 20); // How lighter tail

  const head = hslToHex(hue, sat, lightHead);
  const tail = hslToHex(hue, Math.max(35, sat - 10), lightTail);

  return { head, tail };
}

function strokeFromIntensitySeverity(intensityRaw, severityRaw) {
  const i = clamp01((Number(intensityRaw) || 0) / 100);
  const sev = String(severityRaw || "").toLowerCase();
  const bump =
    sev === "high" ? 0.4 : sev === "medium" || sev === "med" ? 0.2 : 0;
  return 0.6 + i * 1.6 + bump; // ~0.6..2.6
}

export { colorFromSeverityIntensity, strokeFromIntensitySeverity, hslToHex };
