export type Photo = {
  src: string;
  alt: string;
  caption: string;
  // Load immediately (use for the first photo that is visible on screen).
  eager?: boolean;
  // Natural proportions of the image, used so a fixed-height frame shows it uncropped.
  ratio?: { w: number; h: number };
};

export type Chapter = {
  number: string; // "01"
  title: string;
  body: string;
  // beside: one photo next to the text
  // slider: rotating photos next to the text (changes every 2 seconds)
  // grid:   a centred row of photos under the text
  layout: "beside" | "slider" | "grid";
  // Used only for layout "beside": landscape frame instead of portrait.
  photoAspect?: "portrait" | "landscape";
  // Caps the photo column width so the image is smaller beside the text.
  compactMedia?: boolean;
  // Grid only: every photo in the row gets the same frame height.
  matchHeight?: boolean;
  // Grid only: photos share one fixed height (25rem) and sit in a centred row.
  // Photos with a ratio take their natural width at that height.
  fixedHeight?: boolean;
  photos: Photo[];
};

// Photos live in the folder the team already uses.
const IMG = "/assets/kondapalli";
// Logos sit in the same folder as the photos.
const LOGO = IMG;

export const kondapalli = {
  seo: {
    title: "Kondapalli — Stories Carved in Wood",
    description:
      "The journey of a heritage animation project: how JaaDeX and the Kondapalli artisans are bringing wooden bommalu to life through animation, gaming and digitisation.",
    ogImage: `${IMG}/ch08-unveiling.png`,
    ogAlt: "Guests and supporters at the Kondapalli project unveiling",
  },
  chapters: [
    {
      number: "01",
      title: "A Craft at a Crossroads",
      compactMedia: true,
      body: "Kondapalli bommalu have been carved by hand for generations, passed from parent to child. If we promote them more, demand will grow — but who will actually make them? Will the next generation take an interest? Many young people from artisan families have already settled in other fields, and the passion of the past is fading. If the craft is to survive, we must change with the generations too.",
      layout: "beside",
      photos: [
        {
          src: `${IMG}/ch01-master.png`,
          alt: "An elderly master craftsman standing beside three painted Kondapalli figures",
          caption: "Some masters have carved for a lifetime.",
        },
      ],
    },
    {
      number: "02",
      title: "Where It Began",
      compactMedia: true,
      body: "Our journey began at the artisans' doorsteps. Before planning anything, we visited their homes and workshops, sat with the makers and listened to their stories.",
      layout: "slider",
      photos: [1, 2, 3, 4, 5].map((n) => ({
        src: `${IMG}/ch02-${n}.png`,
        alt: `Artisan workshop scene, photo ${n} of 5`,
        caption: "Homes that are also workshops.",
      })),
    },
    {
      number: "03",
      title: "How We Research",
      matchHeight: true,
      body: "We documented the craft step by step: the tools, the Tella Poniki wood, the carving, the sawdust-and-tamarind paste and the painting — capturing every face, colour and pattern as reference for animation.",
      layout: "grid",
      photos: [
        {
          src: `${IMG}/ch03-tools.png`,
          alt: "Hand tools laid out on a workshop floor",
          eager: true,
          caption: "The tools have hardly changed.",
        },
        {
          src: `${IMG}/ch03-raw-vs-finished.png`,
          alt: "A raw carved form placed beside the finished painted toy",
          caption: "Raw form beside the finished toy.",
        },
        {
          src: `${IMG}/ch03-painting.png`,
          alt: "Women artisans painting a wooden toy",
          caption: "Learning with the women who paint the toys.",
        },
      ],
    },
    {
      number: "04",
      title: "Characters Waiting for a Story",
      matchHeight: true,
      body: "Gods, soldiers, musicians, farmers and mothers — every Kondapalli toy is a character waiting for a story. We studied each one from every side, as an animator would.",
      layout: "grid",
      photos: [
        {
          src: `${IMG}/ch04-mom-and-child.png`,
          alt: "A mother and her young son, carved as a pair of wooden figures",
          caption: "A mother and son, waiting for their story.",
        },
        {
          src: `${IMG}/ch02-1.png`,
          alt: "The Panchamukhi Hanuman toy with its five faces",
          caption: "Panchamukhi Hanuman",
        },
        {
          src: `${IMG}/ch02-4.png`,
          alt: "The Matsya fish toy",
          caption: "Matsya",
        },
      ],
    },
    {
      number: "05",
      title: "A New Idea",
      body: "So that the next generation knows these toys — and to give them new life — this innovative idea took shape with the support of Dr. G. Lakshmisha, IAS, District Collector, NTR District. Under the P4 initiative, we are taking the Kondapalli bommalu animation, gaming and digitisation project forward.",
      layout: "beside",
      photoAspect: "landscape",
      photos: [
        {
          src: `${IMG}/ch05-group.png`,
          alt: "Group photo of the project team and guests in a meeting room",
          caption: "Sharing the vision at Ratan Tata Innovation Hub.",
        },
      ],
    },
    {
      number: "06",
      title: "A Partnership Signed",
      body: "At the N.T.R. District office, JaaDeX Innovision and the Kondapalli artisans' society signed a Memorandum of Understanding — making the artisans partners in the project.",
      layout: "beside",
      photos: [
        {
          src: `${IMG}/ch06-mou.png`,
          alt: "Representatives exchanging the signed MoU documents",
          caption: "Now partners.",
        },
      ],
    },
    {
      number: "07",
      title: "From Wood to Screen",
      matchHeight: true,
      fixedHeight: true,
      body: "Each toy is photographed from every angle and rebuilt as a 3D character — keeping its hand-painted look — ready for animation and games.",
      layout: "grid",
      photos: [
        {
          src: `${IMG}/ch07-soldier-angles.png`,
          alt: "Front, side and back views of the soldier toy",
          ratio: { w: 762, h: 430 },
          caption: "The soldier, studied from every angle.",
        },
        {
          src: `${IMG}/ch07-hanuman-3d.png`,
          alt: "Panchamukhi Hanuman as a 3D digital character",
          caption: "Panchamukhi Hanuman as a digital character.",
        },
      ],
    },
    {
      number: "08",
      title: "The Unveiling",
      body: "The project was unveiled before guests and supporters, with the wooden toys and their animated versions shown side by side.",
      layout: "beside",
      photoAspect: "landscape",
      photos: [
        {
          src: `${IMG}/ch08-unveiling.png`,
          alt: "Guests and supporters at the project unveiling",
          caption: "The unveiling.",
        },
      ],
    },
  ] satisfies Chapter[],
  roadAhead: {
    label: "FROM WOOD TO SCREEN",
    title: "The Road Ahead",
    steps: [
      { number: "01", title: "Research & documentation" },
      { number: "02", title: "Visual development" },
      { number: "03", title: "Pilot animation" },
      { number: "04", title: "Series, film & games" },
    ],
    tagline: "Modern Appeal, Traditional Soul",
  },
  closing: {
    quote: "So the next generation knows them — and the bommalu come alive again.",
    logos: {
      jaadex: { src: `${LOGO}/logo-jaadex.png`, alt: "JaaDeX Innovision logo" },
      society: { src: `${LOGO}/logo-kondapalli-society.png`, alt: "Kondapalli Art & Crafts Society logo" },
    },
    credits: [
      "JaaDeX Innovision Pvt. Ltd. × Kondapalli Art & Crafts Society",
      "With the support of Dr. G. Lakshmisha, IAS, District Collector, NTR District · P4 Initiative",
      "With gratitude to the artisans of Kondapalli",
    ],
    website: { label: "www.jaadex.com", href: "https://www.jaadex.com" },
  },
};
