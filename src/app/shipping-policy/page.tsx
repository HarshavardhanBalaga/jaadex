import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "@/components/LegalDocument";
import { business } from "@/lib/business";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy",
  description: "How JaaDeX delivers its digital offerings and workshop confirmations, and what to do if you do not receive them.",
};

const sections: LegalSection[] = [
  {
    heading: "Digital offerings, not physical goods",
    body: [
      "JaaDeX does not sell or ship physical products. Our offerings are digital or delivered in person: confirmations, registration details and access are provided electronically, and workshops take place at the venue stated in each listing.",
      "No courier, postal or shipping service is used, and no shipping charges apply.",
    ],
  },
  {
    heading: "Confirmation after registration or payment",
    body: [
      "Once your registration is saved, or your payment for an offering is successful, you will receive a confirmation by email at the address you used to register. The confirmation shows the offering, the date and time (where set), the location and the next steps.",
      "If a payment is taken but the confirmation is not issued, the payment is handled as set out in the Refund & Cancellation Policy.",
    ],
  },
  {
    heading: "How you receive access",
    body: [
      `Access is delivered in one or more of these ways: the confirmation email sent to your registered address; your JaaDeX account on this website, where the workshop page shows that you are registered; and the workshop or programme details published on the Workshops page or sent to you by email.`,
      "Please keep the confirmation email, as it contains the details you need on the day.",
    ],
  },
  {
    heading: "Expected timing",
    body: [
      "Confirmation emails are normally sent shortly after registration or payment. If an email cannot be sent, the failure is recorded and our team can resend the confirmation on request.",
      "Where a workshop or programme date is still to be announced, the listing on the website says so.",
    ],
  },
  {
    heading: "If you do not receive your confirmation",
    body: [
      "Please check your spam, junk or promotions folders first, and make sure the email address on your JaaDeX account is correct.",
      `If you still have not received it, email ${business.email} with the subject “Confirmation not received”. Include your full name, the email address you used to register, and the workshop or programme name. We will check your registration and resend the confirmation or confirm your place by email.`,
    ],
  },
  {
    heading: "Access problems and support",
    body: [
      `If you cannot open the workshop page, your account or your details, contact us at ${business.email} or on ${business.phoneDisplay} (WhatsApp). Please describe the problem and include a screenshot where possible, without sharing your password.`,
    ],
  },
  {
    heading: "Changes to delivery",
    body: [
      "If we change the date, time, venue or format of an offering after you have booked, we will inform you by email. For cancellations or refunds, see the Refund & Cancellation Policy.",
    ],
  },
];

export default function ShippingPolicyPage() {
  return (
    <LegalDocument
      title="Shipping & Delivery Policy"
      intro="JaaDeX offerings are digital or delivered in person, so there is nothing to ship. This page explains how confirmations and access are delivered and what to do if they do not reach you."
      updated="November 2026"
      sections={sections}
    />
  );
}
