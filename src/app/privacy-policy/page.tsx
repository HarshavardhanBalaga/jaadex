import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "@/components/LegalDocument";
import { business } from "@/lib/business";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How JaaDeX Innovision collects, uses, shares and protects personal information, including information about children, on the JaaDeX website.",
};

const sections: LegalSection[] = [
  {
    heading: "Who we are",
    body: [
      `This policy explains how ${business.legalName} (“JaaDeX”, “we”, “us”), which operates the JaaDeX brand, handles personal information when you visit ${business.website}, create an account, send an enquiry, register for a workshop or contact us. Our office address is ${business.addressLines.join(", ")}.`,
    ],
  },
  {
    heading: "Information we collect",
    body: [
      "Account information: name, email address, a password stored only as a secure hash, and, if you sign in with Google, the Google account identifier we need to link your account. We also keep the one-time codes and login sessions needed to keep you signed in securely.",
      "Workshop registrations: the name, 10-digit phone number and email address you enter, the workshop you register for, and records of the confirmation email we send you.",
      "Enquiries: your name, email address, organization (optional), the area you are interested in and your message.",
      "Technical information: a short-lived record of your IP address used to limit repeated requests, and basic server logs needed to keep the site running and secure.",
      "Administrator accounts: for JaaDeX team members only, name, email address, a hashed password, login codes and session records.",
      "Payment information: we do not collect, see or store payment card, UPI or bank account details on this website. See the section on payments below.",
    ],
  },
  {
    heading: "Why we collect it and how we use it",
    body: [
      "We use account and registration information to create and secure your account, confirm your workshop place, send confirmation and important service emails, and show you your registration status.",
      "We use enquiry details to reply to you, arrange a demo, workshop or school programme, and share relevant programme details. We also use technical information to prevent spam, abuse and repeated submissions, and to improve the website.",
      "We do not sell your personal information, and we do not use it for advertising.",
    ],
  },
  {
    heading: "Payments",
    body: [
      "The website does not currently take online payments, so we do not process or store payment details here. Where a fee applies to an offering, we will tell you the amount first.",
      "If paid offerings are introduced, payments will be taken by a payment service provider, and this policy will be updated before then to name the provider and explain what payment information it receives. Card and bank details will be handled by that provider, not stored by JaaDeX on this website.",
    ],
  },
  {
    heading: "Cookies",
    body: [
      "We use only essential cookies. These keep you signed in to your JaaDeX account, keep administrator sessions secure, and protect forms against misuse. They are needed for the website to work, so they cannot be switched off. We do not use advertising or analytics cookies.",
    ],
  },
  {
    heading: "Third-party service providers",
    body: [
      "We share information only with service providers that help us run the website and provide our services, such as the provider that hosts our database (MongoDB Atlas), the email service that sends account, registration and enquiry emails, and Google, if you choose to sign in with it.",
      "These providers may process information only to provide their services to us. We may also disclose information where the law requires it.",
    ],
  },
  {
    heading: "Information about children",
    body: [
      "Many JaaDeX activities are for school students, some of whom are under 18. We do not want children to give us personal information on their own.",
      "A child under 18 should use the website, create an account or register for an activity only with a parent or legal guardian. The parent or guardian gives the consent for the information about the child that is entered, and receives the related emails.",
      "We do not verify ages at sign-up. We do not knowingly collect personal information from a child without consent from a parent or guardian. If we learn that we have collected such information without consent, we will delete it as soon as practicable.",
      "We do not use children’s personal information for marketing or advertising. Where a school or parent asks us to remove a child’s information, we will do so as described under “Your rights”.",
    ],
  },
  {
    heading: "Storage, security and retention",
    body: [
      "We protect personal information with access limits, hashed passwords, and login codes stored only as hashes. Sessions and one-time codes expire after a set time. Access to administrator tools is restricted to authorised team members.",
      "We keep account and registration information for as long as your account or registration is needed to provide the service and, after that, for any period the law requires. Enquiry details are kept as long as needed to respond and manage the relationship. We delete or anonymise information when you ask us to, or when it is no longer needed, unless we must keep it for legal or accounting reasons.",
      "No online service is completely secure, so please avoid sending sensitive personal details, such as government identity numbers or health information, through the forms.",
    ],
  },
  {
    heading: "Your rights and privacy requests",
    body: [
      `You may ask us to see, correct or delete the personal information we hold about you, to withdraw consent you have given, or to raise a concern about how we handle it. Email ${business.email} with the subject “Privacy request”. We may ask you to confirm your identity before we act.`,
      "A parent or legal guardian may make these requests for a child. Where the Digital Personal Data Protection Act, 2023 applies to you, we will handle requests in line with that Act. We will respond within a reasonable time.",
    ],
  },
  {
    heading: "Concerns and grievances",
    body: [
      "If you are not satisfied with our response, follow the grievance steps on our Contact page. Grievances about personal information are handled in the same way.",
    ],
  },
  {
    heading: "Changes to this policy",
    body: [
      "We may update this policy from time to time. The date at the top shows when it was last changed. Continued use of the website after a change means you accept the updated policy.",
    ],
  },
  {
    heading: "Contact us about privacy",
    body: [
      `For privacy questions, email ${business.email} or call or WhatsApp ${business.phoneDisplay}. Write to ${business.legalName}, ${business.addressLines.join(", ")}.`,
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      intro="We respect your privacy. This page explains what information JaaDeX collects through this website, why we need it, how we protect it, and the choices you have, including for information about children."
      updated="November 2026"
      sections={sections}
    />
  );
}
