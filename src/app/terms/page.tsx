import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Terms that apply when you use the JaaDeX website, send an enquiry or take part in a JaaDeX programme.",
};

const sections: LegalSection[] = [
  {
    heading: "Acceptance of these terms",
    body: [
      "By using the JaaDeX Innovision Pvt Ltd website (the “Website”), you agree to these Terms and Conditions. If you do not agree, please do not use the Website.",
    ],
  },
  {
    heading: "About the Website",
    body: [
      "The Website gives information about JaaDeX’s animation, storytelling and creative technology learning, including school programmes, workshops, projects, demos and partnerships. Information on the Website is provided for general purposes and may change without notice.",
    ],
  },
  {
    heading: "Enquiries, demos and workshops",
    body: [
      "Submitting a form on the Website is an enquiry, not a booking. Any demo, workshop, school package or partnership is confirmed only in writing by JaaDeX and may be subject to a separate agreement, fees and schedule.",
      "You must give accurate information and use the forms only for genuine enquiries.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "You agree not to misuse the Website. In particular, you must not attempt to gain unauthorized access to any part of it, interfere with its operation, send spam or automated requests, submit false information, or copy or resell content without permission.",
    ],
  },
  {
    heading: "Intellectual property",
    body: [
      "The JaaDeX name, logo, Website design, text, images, videos and learning materials are owned by JaaDeX Innovision Pvt Ltd or used with permission. You may view and share pages for personal or school use, but you may not reproduce, modify or commercially use them without our written consent.",
    ],
  },
  {
    heading: "Third-party links",
    body: [
      "The Website may link to third-party sites, such as social media pages. We do not control those sites and are not responsible for their content or practices.",
    ],
  },
  {
    heading: "Disclaimer",
    body: [
      "The Website and its content are provided “as is”. We do not guarantee that the Website will always be available, error-free or suitable for a particular purpose.",
    ],
  },
  {
    heading: "Limitation of liability",
    body: [
      "To the fullest extent permitted by law, JaaDeX is not liable for any indirect or consequential loss arising from your use of the Website. Our total liability for any claim relating to the Website is limited to the amount you paid us, if any, for the service in question.",
    ],
  },
  {
    heading: "Privacy",
    body: ["Our handling of personal information is described in the Privacy Policy, which forms part of these terms."],
  },
  {
    heading: "Governing law",
    body: [
      "These terms are governed by the laws of India. Any dispute arising from them is subject to the exclusive jurisdiction of the courts in Andhra Pradesh, India.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "If you have questions about these terms, contact JaaDeX Innovision Pvt Ltd at info@jaadex.com or 4th Floor, Ratan Tata Innovation Hub, Mayuri Techpark, Amaravati, Andhra Pradesh.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms and Conditions"
      intro="These terms set out the rules for using the JaaDeX website and making enquiries through it. Please read them carefully."
      updated="October 2026"
      sections={sections}
    />
  );
}
