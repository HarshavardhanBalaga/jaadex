import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "@/components/LegalDocument";
import { business } from "@/lib/business";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "How cancellations, refund requests, duplicate and failed payments are handled for JaaDeX workshops, school programmes and digital services.",
};

const sections: LegalSection[] = [
  {
    heading: "Scope of this policy",
    body: [
      "This policy applies to every paid JaaDeX offering, including school programmes, workshops, creative challenges and digital access, whether bought through this website or agreed with JaaDeX in writing.",
      "Workshop seats are currently reserved through your JaaDeX account on the website. Where a fee applies, JaaDeX will tell you the amount and the cancellation terms for that offering before you pay.",
    ],
  },
  {
    heading: "When you may be eligible for a refund",
    body: [
      "You may request a refund in these cases: JaaDeX cancels the offering or cannot deliver it; you were charged more than once for the same offering; your payment was debited but the registration was not confirmed; or you cancel within the period stated in the offering’s written terms.",
      "Each refund request is reviewed against the terms that applied when you paid. Refunds are issued only to the original payment method unless we agree otherwise in writing.",
    ],
  },
  {
    heading: "How to request a cancellation",
    body: [
      `Email ${business.email} with the subject “Cancellation”. Include your full name, the email address on your JaaDeX account, the workshop or programme name, and the payment or order reference if you have one.`,
      "A cancellation takes effect when JaaDeX confirms it to you by email. Until then, your place remains booked.",
    ],
  },
  {
    heading: "How to request a refund",
    body: [
      `Email ${business.email} with the subject “Refund request”. Include the same details as a cancellation, the reason for the request and the payment reference, if available.`,
      "We will confirm receipt and let you know the outcome by email. If a refund is approved, we will tell you the amount and the date it was initiated.",
    ],
  },
  {
    heading: "Cancellation before the offering starts",
    body: [
      "If you cancel before a workshop, school programme or digital service starts, you will receive the refund stated in that offering’s written cancellation terms. Those terms are confirmed to you before you pay.",
    ],
  },
  {
    heading: "Cancellation after the offering has started",
    body: [
      "Once a workshop, school programme or digital service has started, sessions or access already delivered are not refundable. For any remaining part that has not been delivered, a refund or transfer is decided against the written terms for that offering.",
      "This does not affect your rights where JaaDeX has not delivered the offering as described.",
    ],
  },
  {
    heading: "Cancellations and changes by JaaDeX",
    body: [
      "If JaaDeX cancels an offering, or moves it to a date you cannot attend, you will be offered a full refund of the amount you paid. Where you agree, you may transfer your place to the rescheduled date instead.",
    ],
  },
  {
    heading: "Duplicate payments",
    body: [
      "If you are charged more than once for the same offering, email us with both payment references. We will confirm the duplicate and refund the extra amount to the original payment method.",
    ],
  },
  {
    heading: "Failed payments where money was debited",
    body: [
      "If a payment fails but your account is debited, the amount is usually reversed automatically by your bank or payment provider. If you do not see the reversal or your registration is not confirmed, contact us with the payment reference and the date and time of the transaction.",
      "We will check the payment with our payment provider and, if the offering was not confirmed, arrange a refund or confirm your place.",
    ],
  },
  {
    heading: "Refund processing time",
    body: [
      "Once a refund is approved, we start it promptly and confirm to you by email. The amount then reaches your account according to your bank or card issuer, which can take several working days. JaaDeX cannot control that step once the refund has been initiated.",
    ],
  },
  {
    heading: "Children and guardians",
    body: [
      "Where an offering is booked for a child, the parent or legal guardian who made the booking is the person who may request a cancellation or refund, and who will receive all related emails.",
    ],
  },
  {
    heading: "Escalation",
    body: [
      "If you are not satisfied with a refund or cancellation decision, follow the grievance steps on our Contact page. You can reach us at the contact details listed on that page.",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalDocument
      title="Refund & Cancellation Policy"
      intro="This policy explains how to cancel a booking, request a refund and what happens with duplicate or failed payments for JaaDeX workshops, school programmes and digital services."
      updated="November 2026"
      sections={sections}
    />
  );
}
