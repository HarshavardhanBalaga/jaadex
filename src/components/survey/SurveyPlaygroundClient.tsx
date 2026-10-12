"use client";

import { useMemo, useState } from "react";
import { Model, type ITheme } from "survey-core";
import { Survey } from "survey-react-ui";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";
import { loadPlaygroundJson, type SurveyJson } from "@/lib/survey/workshop-demo";
import { jaadexTheme, type ThemeSource } from "@/lib/survey/jaadex-theme";

const tabClass = (active: boolean) =>
  `cursor-pointer rounded-full px-5 py-2.5 text-[13px] font-black transition-colors motion-reduce:transition-none ${
    active ? "bg-royal text-white shadow-pop-royal" : "bg-[#eef3ff] text-royal hover:bg-[#dde7ff]"
  }`;

/**
 * SurveyJS playground: visual builder (Creator) beside a live visitor preview
 * (Form Library). Builder edits flow into the preview; test submissions stay
 * in component state only — nothing is saved or sent anywhere.
 */
export function SurveyPlaygroundClient() {
  const [tab, setTab] = useState<"builder" | "preview">("builder");
  const [definition, setDefinition] = useState<SurveyJson>(() => loadPlaygroundJson());
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  // Theme styling: JaaDeX brand preset by default, or whatever the admin
  // customized in the builder's Theme tab.
  const [themeSource, setThemeSource] = useState<ThemeSource>("jaadex");
  const [customTheme, setCustomTheme] = useState<ITheme | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const creator = useMemo(() => {
    const c = new SurveyCreator({
      showLogicTab: true,
      showTranslationTab: true,
      showThemeTab: true,
    });
    c.text = JSON.stringify(loadPlaygroundJson());
    // Start the builder itself on-brand; the admin can diverge freely.
    try {
      c.theme = jaadexTheme;
    } catch {
      // Older/unknown theme shape — builder keeps its default theme.
    }
    // Capture Theme-tab saves so the preview can reuse the custom styling.
    c.saveThemeFunc = (saveNo: number, callback: (no: number, success: boolean) => void) => {
      try {
        setCustomTheme(JSON.parse(JSON.stringify(c.theme)) as ITheme);
      } catch {
        // Keep the previous custom theme on export failure.
      }
      callback(saveNo, true);
    };
    // Push every builder change into the preview definition (live sync).
    c.onModified.add(() => {
      try {
        setDefinition(JSON.parse(c.text) as SurveyJson);
      } catch {
        // Intermediate invalid JSON while typing in the JSON tab — ignore.
      }
    });
    return c;
  }, []);

  const previewModel = useMemo(() => {
    const model = new Model(definition);
    const theme = themeSource === "jaadex" ? jaadexTheme : themeSource === "custom" ? customTheme : undefined;
    if (theme) {
      try {
        model.applyTheme(theme);
      } catch {
        // Unknown theme shape — preview keeps the default SurveyJS theme.
      }
    }
    model.onComplete.add((sender) => {
      setSubmitted((sender.data ?? {}) as Record<string, unknown>);
    });
    return model;
    // previewKey is an intentional cache-buster (fresh model on "Fill again").
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition, themeSource, customTheme, previewKey]);

  function captureTheme() {
    try {
      setCustomTheme(JSON.parse(JSON.stringify(creator.theme)) as ITheme);
    } catch {
      // Keep the previous custom theme on read failure.
    }
  }

  function refreshPreview() {
    try {
      setDefinition(JSON.parse(creator.text) as SurveyJson);
    } catch {
      // Keep the last good definition if the JSON tab has a draft error.
    }
    captureTheme();
    setSubmitted(null);
    setPreviewKey((k) => k + 1);
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  function exportThemeJson(): string {
    const theme = themeSource === "custom" && customTheme ? customTheme : jaadexTheme;
    return JSON.stringify(theme, null, 2);
  }

  return (
    <div className="grid gap-4">
      <p role="note" className="rounded-xl bg-[#fff4e0] px-3 py-2.5 text-[13px] font-bold text-[#8a5a00]">
        Demo only — builder edits and test answers stay in this browser tab. Nothing is saved, emailed, or stored.
      </p>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Playground views">
        <button type="button" role="tab" aria-selected={tab === "builder"} onClick={() => setTab("builder")} className={tabClass(tab === "builder")}>
          Form builder
        </button>
        <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => { refreshPreview(); setTab("preview"); }} className={tabClass(tab === "preview")}>
          Visitor preview
        </button>
      </div>

      {tab === "builder" ? (
        <div className="overflow-hidden rounded-[18px] border border-line bg-white">
          <SurveyCreatorComponent creator={creator} />
          <p className="border-t border-line bg-paper px-5 py-3 text-[12px] text-muted">
            Add, remove, reorder, and configure questions above — the visitor preview updates live. Use the Creator&apos;s
            Preview tab for a quick look, or the Visitor preview tab here for the exact website rendering.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-line bg-white p-[21px] md:p-[27px]">
          {submitted ? (
            <div role="status" className="grid gap-3">
              <div className="rounded-xl bg-[#e3ecff] px-3 py-2.5 text-[13px] font-bold text-royal">
                Test submission received (kept only in this tab — nothing was stored).
              </div>
              <dl className="divide-y divide-line rounded-xl border border-line">
                {Object.entries(submitted).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[180px_1fr] gap-3 px-4 py-3 max-sm:grid-cols-1 max-sm:gap-1">
                    <dt className="text-xs font-black tracking-[1px] text-muted uppercase">{k}</dt>
                    <dd className="text-[14px] font-bold text-navy break-all">{String(v)}</dd>
                  </div>
                ))}
              </dl>
              <button type="button" onClick={() => { setSubmitted(null); setPreviewKey((k) => k + 1); }}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-royal px-5 py-[13px] text-center font-black text-white shadow-pop-royal">
                Fill again →
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Preview styling">
                <span className="text-xs font-black tracking-[1px] text-muted uppercase">Styling:</span>
                {(
                  [
                    ["jaadex", "JaaDeX brand"],
                    ["custom", "Builder custom"],
                    ["default", "Survey default"],
                  ] as Array<[ThemeSource, string]>
                ).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => { if (value === "custom") captureTheme(); setThemeSource(value); }}
                    aria-pressed={themeSource === value} className={tabClass(themeSource === value)}>
                    {label}
                  </button>
                ))}
              </div>
              <Survey model={previewModel} />
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button type="button" onClick={refreshPreview} className="text-[13px] font-bold text-royal hover:underline">
                  Re-sync with builder ↻
                </button>
                <button type="button" onClick={() => void copyText(JSON.stringify(definition, null, 2), "form")}
                  className="text-[13px] font-bold text-royal hover:underline">
                  {copied === "form" ? "Form JSON copied ✓" : "Copy form JSON"}
                </button>
                <button type="button" onClick={() => void copyText(exportThemeJson(), "theme")}
                  className="text-[13px] font-bold text-royal hover:underline">
                  {copied === "theme" ? "Theme JSON copied ✓" : "Copy theme JSON"}
                </button>
              </div>
              <p className="mt-2 text-[12px] text-muted">
                Exported JSON is what a future Workshop record would store — hand it to a developer, no rework needed.
              </p>
            </>
          )}
        </div>
      )}
      <p className="text-[12px] text-muted">
        Survey Creator is commercial software (per-developer license for production use); this evaluation runs
        unlicensed. The Form Library renderer is MIT-licensed and free.
      </p>
    </div>
  );
}
