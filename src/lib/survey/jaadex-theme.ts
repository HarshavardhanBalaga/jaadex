/**
 * JaaDeX brand preset for SurveyJS (flat base, light palette).
 * Hex values mirror src/app/globals.css brand tokens. Unknown keys are
 * ignored by the browser, so this stays safe across SurveyJS minor versions.
 * Future seam: stored next to the form JSON on a Workshop document.
 */
import type { ITheme } from "survey-core";

export const jaadexTheme: ITheme = {
  themeName: "flat",
  colorPalette: "light",
  isPanelless: false,
  cssVariables: {
    // Primary actions, links, accents — royal.
    "--sjs2-color-project-brand-600": "#1450d6",
    "--sjs2-color-bg-brand-secondary": "rgba(20, 80, 214, 0.1)",
    "--sjs2-color-bg-brand-primary-dim": "#0c35a0",
    // Surfaces — white cards on paper background.
    "--sjs2-color-utility-surface-survey": "#ffffff",
    "--sjs2-color-utility-surface-designer": "#ffffff",
    "--sjs2-color-bg-basic-primary": "#fbfcff",
    "--sjs2-color-bg-basic-secondary": "#ffffff",
    "--sjs2-color-bg-basic-primary-dim": "#e8eefb",
    "--sjs2-color-bg-basic-secondary-dim": "#e8eefb",
    "--sjs2-color-bg-neutral-tertiary-dim": "#ffffff",
    // Text — ink headings, muted secondary.
    "--sjs2-color-fg-basic-primary": "#1a2358",
    "--sjs2-color-fg-basic-secondary": "#52608a",
    // Borders — line token.
    "--sjs2-color-border-basic-secondary": "#dbe3f5",
    "--sjs2-color-border-basic-secondary-overlay": "#cfd9f0",
    "--sjs2-border-effect-component-formbox-default": "0px 0px 0px 1px #dbe3f5",
    "--sjs2-border-effect-surface-default": "0px 0px 0px 1px #dbe3f5",
  },
};

export type ThemeSource = "jaadex" | "custom" | "default";
