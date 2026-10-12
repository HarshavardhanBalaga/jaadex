/**
 * SurveyJS playground definitions.
 * Future seam: `loadPlaygroundJson` becomes "fetch form JSON by workshop slug"
 * and `handlePlaygroundComplete` becomes "POST answers to the backend" —
 * the playground components consume only these two functions, so the real
 * workshop feature snaps on without touching them.
 */

export type SurveyJson = Record<string, unknown>;

export const workshopDemoJson: SurveyJson = {
  title: "JaaDeX Workshop Registration",
  description: "Reserve a seat — the team confirms every registration by email.",
  elements: [
    {
      type: "text",
      name: "fullName",
      title: "Full name",
      isRequired: true,
      maxLength: 80,
    },
    {
      type: "text",
      name: "email",
      title: "Email address",
      inputType: "email",
      isRequired: true,
      validators: [{ type: "email" }],
    },
    {
      type: "dropdown",
      name: "interest",
      title: "Type of enquiry / workshop",
      isRequired: true,
      choices: [
        "JaaDeX Animate for Schools",
        "AI Filmmaking Courses",
        "Animation and Storytelling",
        "Partnership or Collaboration",
        "Product Demonstration",
        "General Enquiry",
      ],
    },
    {
      type: "comment",
      name: "message",
      title: "Message",
      rows: 4,
    },
  ],
};

/** PoC loader: returns a fresh copy so the builder can mutate freely. */
export function loadPlaygroundJson(): SurveyJson {
  return JSON.parse(JSON.stringify(workshopDemoJson)) as SurveyJson;
}
