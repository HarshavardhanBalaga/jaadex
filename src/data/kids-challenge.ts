/**
 * JaaDeX Kids Creative Challenge: all page copy, supplied verbatim.
 * Do not rewrite or invent content here; change only what the organisers supply.
 */

/**
 * Central registration link: every CTA on the page opens the registration form.
 * Payment is not collected yet; registrations are saved with payment pending.
 */
export const registrationHref = "/kids-creative-challenge/register";

export const brand = "JaaDeX";
export const challengeTitle = "Kids Creative Challenge";

export const navLinks = [
  { label: "The Challenge", href: "#challenge" },
  { label: "Benefits", href: "#benefits" },
  { label: "Prizes", href: "#prizes" },
  { label: "How to Join", href: "#how-to-join" },
];

export const hero = {
  eyebrow: "For school students across India · Classes 1–10",
  heading: "Kids Creative Challenge",
  headline: "Don't just read your textbook. Bring your lessons to life!",
  description: "Choose one lesson from your school textbook, turn it into a comic, and transform it into an animated story.",
  cta: "Join the Challenge →",
  price: "Only ₹99",
  tagline: "Imagine · Illustrate · Animate · Inspire",
  icons: ["📚", "✏️", "🎨", "🎬"],
};

export const introduction = {
  heading: "One Lesson. One Comic. One Animation.",
  subheading: "Your ideas deserve to come alive.",
  highlights: ["Young creators", "Original ideas", "Recognition"],
};

export const mission = {
  sectionLabel: "The creative mission",
  heading: "Turn classroom learning into creativity",
  description:
    "Pick a lesson from Science, Mathematics, Social Studies, English, Telugu or another school subject. Reimagine it as a story that others will love to read and watch.",
  steps: [
    { number: "01", title: "Choose a Lesson", description: "Select one lesson from your school textbook." },
    { number: "02", title: "Create a Comic", description: "Build an original 4–8 panel comic with characters and dialogue." },
    { number: "03", title: "Animate Your Story", description: "Bring your comic to life in a 30–90 second animation." },
    { number: "04", title: "Submit & Shine", description: "Submit both creations through the JaaDeX student dashboard." },
  ],
};

export const benefits = {
  sectionLabel: "Registration benefits",
  heading: "Join the JaaDeX Kids Creative Challenge",
  description: "Every registered student gets access to creative learning resources, the E-Comic Learning Book and a moderated creator community.",
  price: "₹99",
  priceNote: "PER STUDENT · ENTRY FEE",
  cards: [
    { title: "E-Comic Learning Book", description: "Learn comic creation, character design, storytelling and animation basics.", icon: "book" },
    { title: "Creative Resources", description: "Access worksheets, story prompts, templates and learning guides.", icon: "pencil" },
    { title: "Moderated Creator Community", description: "Share progress and receive guided feedback in a safe, supervised space.", icon: "users" },
    { title: "Student Dashboard", description: "Access your learning library, challenge details and submission status.", icon: "dashboard" },
    { title: "Monthly Creative Activities", description: "Explore new prompts and keep practising throughout your membership.", icon: "sparkles" },
    { title: "Certificates & Recognition", description: "Receive a membership certificate; participation and awards follow the competition rules.", icon: "graduation" },
  ],
  disclaimer: "JaaDeX Animate software licensing, live mentoring and physical kits are not included in the ₹99 membership unless separately announced.",
};

export const prizes = {
  sectionLabel: "Recognition & rewards",
  heading: "Top 10 Student Winners",
  description: "Ten outstanding school-student entries will be selected through the published judging process and awarded cash prizes.",
  cards: [
    { medal: "🥇", label: "1st Prize", amount: "₹5,000" },
    { medal: "🥈", label: "2nd Prize", amount: "₹4,000" },
    { medal: "🥉", label: "3rd Prize", amount: "₹3,000" },
    { medal: "⭐", label: "Ranks 4–10", amount: "₹2,000 each", note: "7 winners" },
  ],
  poolLabel: "Total cash prize pool: ₹26,000",
  judging:
    "Winners will be selected based on originality, connection to the textbook lesson, comic storytelling, animation quality and overall creativity. Full eligibility, judging, tie-break and prize-disbursement terms will be published in the official rules.",
};

export const eligibility = {
  sectionLabel: "Who can participate?",
  heading: "Made for school students",
  points: [
    "Students in Classes 1–10",
    "Approximately ages 5–15",
    "Schools across India",
    "Individual and school registrations",
  ],
  disclaimer: "Parent or legal guardian registration and consent are required for participants under 18.",
};

export const howToJoin = {
  sectionLabel: "Your student journey",
  heading: "Start creating in four simple steps",
  steps: [
    "Parent/guardian registers the student and completes payment.",
    "Student receives dashboard access after verification.",
    "Explore the E-Comic Learning Book and creative resources.",
    "Create, submit and track your challenge entry.",
  ],
  disclaimer: "Learning resources and community access are provided under the published competition terms.",
};

export const finalCta = {
  heading: "Ready to create?",
  description: "Registration is open. Pay ₹99 securely online to confirm your child's entry. For school bulk registrations, please contact JaaDeX.",
  cta: "Register Now – ₹99 →",
  note: "Registration is open. Pay ₹99 securely online to confirm your child's entry. For school bulk registrations, please contact JaaDeX.",
};

export const footer = {
  brand: "JaaDeX Kids Creative Challenge",
  organisedBy: "JaaDeX Innovision Pvt. Ltd.",
  tagline: "Learn · Create · Animate · Share",
  website: "jaadex.com",
  websiteHref: "https://www.jaadex.com",
  emailNote: "For school partnerships and enquiries:",
  email: "info@jaadex.com",
  cta: "Join the Challenge – ₹99",
};

/** Image placeholders: each keeps its aspect ratio and describes the visual to add later. */
export const placeholders = {
  hero: "Children creating colourful educational comics and animation",
  introduction: "Comic panels transforming into animated characters",
  chooseLesson: "School textbook and creative learning illustration",
  createComic: "Colourful comic panels with characters and speech bubbles",
  animate: "Animation timeline and cartoon character illustration",
  submit: "Student submitting a creative project",
};
