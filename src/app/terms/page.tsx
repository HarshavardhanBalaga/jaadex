import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "@/components/LegalDocument";
import { business } from "@/lib/business";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Terms that apply when you use the JaaDeX website, create an account, register for a workshop or take part in a JaaDeX programme.",
};

const sections: LegalSection[] = [
  {
    heading: "Acceptance of these terms",
    body: [
      `These Terms and Conditions apply to the JaaDeX website at ${business.website} (the “Website”), operated by ${business.legalName} (“JaaDeX”, “we”, “us”). By using the Website or booking an offering, you agree to these terms. If you do not agree, please do not use the Website.`,
    ],
  },
  {
    heading: "About the Website and our offerings",
    body: [
      "The Website gives information about JaaDeX’s animation, storytelling and creative technology offerings, including school programmes, workshops, creative projects, demos and partnerships. Information on the Website is provided for general purposes and may change without notice.",
    ],
  },
  {
    heading: "Eligibility and use of the Website",
    body: [
      "You must be at least 18 years old to create an account or buy an offering in your own name. Anyone under 18 may take part in a JaaDeX activity only through a parent or legal guardian, as explained in the section on children below.",
      "You must give accurate information, keep it up to date and use the Website only for lawful purposes.",
    ],
  },
  {
    heading: "Accounts and responsibilities",
    body: [
      "Some features, such as registering for a workshop or sending an enquiry, need a JaaDeX account. You may sign up with an email address and password or with a supported Google account.",
      `You are responsible for keeping your login details confidential and for all activity on your account. Tell us promptly at ${business.email} if you think someone else has accessed it. Each account belongs to one person and may not be shared.`,
      "When you register, we send a one-time code to your email address to verify it before the account is activated.",
    ],
  },
  {
    heading: "Enquiries, registrations and bookings",
    body: [
      "Submitting an enquiry form is a request for information, not a booking. A school programme, custom workshop or partnership is agreed only in writing by JaaDeX and may be subject to a separate agreement, fees and schedule.",
      "A workshop registration is confirmed when you receive a confirmation email. Seats are limited where a capacity is shown, and we may close registration when seats are full.",
    ],
  },
  {
    heading: "Purchases and payment confirmation",
    body: [
      "Where a fee applies, JaaDeX shows the amount, in Indian Rupees (INR), and the cancellation terms before you pay. You accept the offering when you complete the payment or confirm it in writing.",
      "A purchase is confirmed when you receive a confirmation email. If you are charged but do not receive a confirmation, contact us as described in the Refund & Cancellation Policy.",
      "Prices and offerings may change. A change does not affect a purchase that is already confirmed.",
    ],
  },
  {
    heading: "Access to digital services and activities",
    body: [
      "Digital access and registration details are provided as described in the Shipping & Delivery Policy. Access is for the registered person (or, for a child, the child with a parent or guardian’s authority) and for the purpose of the activity only.",
      "You may not resell, transfer or share access or materials supplied as part of an offering without our written permission.",
    ],
  },
  {
    heading: "Workshop and challenge participation",
    body: [
      "Please arrive on time at the venue and date stated in your confirmation, follow the instructions of our facilitators and respect other participants and the venue.",
      "Participants may be asked to leave a session that is disrupted or where safety is at risk. We will try to tell you the reason and, where appropriate, offer an alternative.",
      "Where we change a date, time, venue or format, we will inform you by email. Cancellations and refunds are dealt with in the Refund & Cancellation Policy.",
    ],
  },
  {
    heading: "Children, parents and legal guardians",
    body: [
      "Many JaaDeX activities are for school students, some of whom are under 18. For a child under 18:",
      "A parent or legal guardian must create or manage the account, register the child, give consent to the child taking part and receive all related emails. A child should not register or pay for an activity on their own.",
      "The parent or guardian is responsible for the accuracy of the information given for the child, for supervising the child in travel to and from in-person sessions, and for telling us about any medical, learning or safety needs we should know about.",
      "Where a school books or organises an activity, the school is responsible for arranging the consent of the parents or guardians of the children taking part, and for supervising children in its care. We do not verify ages at sign-up, so please ensure that the person who registers has the authority to do so.",
    ],
  },
  {
    heading: "Cancellation and refunds",
    body: [
      "Cancellations, refunds and the handling of duplicate or failed payments are governed by our Refund & Cancellation Policy, which forms part of these terms.",
    ],
  },
  {
    heading: "Intellectual property",
    body: [
      "The JaaDeX name, logo, Website design, text, images, videos, software and learning materials are owned by JaaDeX Innovision Pvt Ltd or used with permission. You may view and share pages for personal or school use, but you may not reproduce, modify or commercially use them without our written consent.",
      "The rights in creative work produced by participants during an activity, and any showcase of that work, are set out in the written terms for that offering.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "You agree not to misuse the Website. In particular, you must not attempt to gain unauthorized access to any part of it, interfere with its operation, send spam or automated requests, submit false information or registrations, impersonate another person, or copy or resell content without permission.",
    ],
  },
  {
    heading: "Third-party links and services",
    body: [
      "The Website may link to third-party sites, such as social media pages, and may use third-party services such as Google sign-in. We do not control those services and are not responsible for their content or practices.",
    ],
  },
  {
    heading: "Suspension and termination",
    body: [
      "We may suspend or close an account, or cancel a registration, if you breach these terms, provide false information, misuse the Website or put others at risk. Where it is safe and appropriate, we will tell you the reason.",
      `You may stop using the Website at any time and ask us to close your account by emailing ${business.email}.`,
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
      "To the fullest extent permitted by law, JaaDeX is not liable for any indirect or consequential loss arising from your use of the Website. Our total liability for any claim relating to the Website or an offering is limited to the amount you paid us for that offering, if any.",
    ],
  },
  {
    heading: "Changes to services and these terms",
    body: [
      "We may change the Website, our offerings and these terms from time to time. We will update the “Last updated” date above when we do. Changes apply to new bookings and to continuing use of the Website from the date they are published; they do not change a purchase already confirmed.",
    ],
  },
  {
    heading: "Privacy",
    body: [
      "Our handling of personal information is described in the Privacy Policy, which forms part of these terms.",
    ],
  },
  {
    heading: "Governing law and jurisdiction",
    body: [
      "These terms are governed by the laws of India. Any dispute arising from them is subject to the exclusive jurisdiction of the courts in Andhra Pradesh, India.",
    ],
  },
  {
    heading: "Customer support and grievances",
    body: [
      "If you have a question or complaint, contact us first using the details on our Contact page. Grievances are handled under the escalation steps set out there.",
    ],
  },
  {
    heading: "Contact",
    body: [
      `For questions about these terms, contact ${business.legalName} at ${business.email} or ${business.phoneDisplay} (WhatsApp). Office address: ${business.addressLines.join(", ")}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms and Conditions"
      intro="These terms set out the rules for using the JaaDeX website, creating an account, registering for workshops and taking part in JaaDeX programmes. Please read them carefully, especially the section on children."
      updated="November 2026"
      sections={sections}
    />
  );
}
