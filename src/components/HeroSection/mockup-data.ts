export const TRACKS = [
  { name: "Sun", color: "#F58232", bars: [{ l: "6%", w: "34%" }, { l: "52%", w: "22%" }], keys: ["18%", "38%", "66%"] },
  { name: "Hills", color: "#5C7396", bars: [{ l: "6%", w: "68%" }], keys: ["28%", "58%"] },
  { name: "Orbit", color: "#33507E", bars: [{ l: "14%", w: "60%" }], keys: ["22%", "48%", "74%"] },
];
export const INSPECTOR = [
  { label: "Position", value: "420 · 180", slider: 62 },
  { label: "Scale", value: "100%", slider: 48 },
  { label: "Rotation", value: "12°", slider: 30 },
  { label: "Opacity", value: "100%", slider: 84 },
  { label: "Duration", value: "4.0s", slider: 55 },
];
export const TOOLS = ["Select", "Draw", "Text", "Shape"];
export const LAYERS = [
  { name: "Sun", meta: "vector", on: true },
  { name: "Hills", meta: "shape", on: true },
  { name: "Orbit", meta: "motion", on: false },
];

