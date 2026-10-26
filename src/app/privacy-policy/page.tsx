import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How JaaDeX Innovision collects, uses and protects personal information on the JaaDeX website.",
};

const sections: LegalSection[] = [
  {
    heading: "Who we are",
    body: [
      "This policy explains how JaaDeX Innovision Pvt Ltd (“JaaDeX”, “we”, “us”) handles personal information when you visit our website, send an enquiry, request a demo or book a workshop. Our office is at 4th Floor, Ratan Tata Innovation Hub, Mayuri Techpark, Amaravati, Andhra Pradesh.",
    ],
  },
  {
    heading: "Information we collect",
    body: [
      "Enquiry and demo forms: your name, email address, organization (optional), the area you are interested in and your message.",
      "Workshop and partnership requests: the details you choose to share when you contact us about a workshop, school package or collaboration.",
      "Technical information: a short-lived IP address used to limit repeated submissions, and basic server logs needed to keep the site running and secure.",
      "Administrator accounts: for team members only, name, email address, a securely hashed password, one-time login codes and session records.",
    ],
  },
  {
    heading: "How we use your information",
    body: [
      "We use the information to reply to your enquiry, arrange a demo or workshop, share relevant programme details, keep our records accurate, prevent spam and abuse, and improve the website.",
      "We do not sell your personal information.",
    ],
  },
  {
    heading: "Cookies",
    body: [
      "We use essential cookies only. Administrators receive session cookies to stay signed in to the admin area, and the site uses a security cookie to protect forms against misuse. These cookies are needed for the site to work, so they cannot be switched off.",
    ],
  },
  {
    heading: "Sharing and service providers",
    body: [
      "Your details are shared only with the JaaDeX team and with trusted service providers who help us host the website, store enquiries and send emails. They may process your information only to provide these services to us.",
      "We may disclose information if the law requires it.",
    ],
  },
  {
    heading: "Storage and security",
    body: [
      "We use reasonable technical and organizational measures to protect personal information, including access limits for the admin area and encrypted connections. No online service is completely secure, so please avoid sending sensitive personal details through the forms.",
    ],
  },
  {
    heading: "How long we keep information",
    body: [
      "We keep enquiry details for as long as needed to respond to you and manage the relationship, and then delete or anonymize them unless we must keep them for legal or accounting reasons.",
    ],
  },
  {
    heading: "Children’s information",
    body: [
      "Our programmes are used by students. Enquiries about children should be made by a parent, guardian or school representative, who must have the authority to share the information. We do not knowingly collect information from children directly through the website.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "You may ask us to see, correct or delete the personal information we hold about you, or to withdraw consent you have given. Contact us at info@jaadex.com and we will respond within a reasonable time.",
    ],
  },
  {
    heading: "Changes to this policy",
    body: [
      "We may update this policy from time to time. The date at the top shows when it was last changed. Continued use of the website after a change means you accept the updated policy.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      intro="We respect your privacy. This page explains what information JaaDeX collects through this website, why we need it and the choices you have."
      updated="October 2026"
      sections={sections}
    />
  );
}
