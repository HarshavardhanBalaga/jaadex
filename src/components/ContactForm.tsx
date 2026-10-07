"use client";

import { useState } from "react";

const interests = [
  "JaaDeX Animate for Schools",
  "AI Filmmaking Courses",
  "Animation and Storytelling",
  "Partnership or Collaboration",
  "Product Demonstration",
  "General Enquiry",
];

export function ContactForm({ initialInterest = "" }: { initialInterest?: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", organization: "", interest: interests.includes(initialInterest) ? initialInterest : "JaaDeX Animate for Schools", message: "" });

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  const mailto = `mailto:hello@jaadex.com?subject=${encodeURIComponent(`JaaDeX enquiry: ${form.interest}`)}&body=${encodeURIComponent(
    `Name: ${form.name}\nEmail: ${form.email}\nOrganization: ${form.organization || "Not provided"}\nInterest: ${form.interest}\nMessage: ${form.message || "Not provided"}`
  )}`;

  return (
    <form onSubmit={submit}>
      <FormRow label="Your name *" htmlFor="name"><input className={fieldClass} id="name" name="name" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Enter your name" /></FormRow>
      <FormRow label="Email address *" htmlFor="email"><input className={fieldClass} id="email" name="email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" /></FormRow>
      <FormRow label="School / organization" htmlFor="organization"><input className={fieldClass} id="organization" name="organization" value={form.organization} onChange={(e) => update("organization", e.target.value)} placeholder="Organization name (optional)" /></FormRow>
      <FormRow label="I'm interested in *" htmlFor="interest"><select className={fieldClass} id="interest" name="interest" value={form.interest} onChange={(e) => update("interest", e.target.value)}>{interests.map((interest) => <option key={interest}>{interest}</option>)}</select></FormRow>
      <FormRow label="Your message *" htmlFor="message"><textarea className={fieldClass} id="message" name="message" required rows={4} value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Tell us about your needs or idea…" /></FormRow>
      <button className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-5 py-[13px] text-center font-black text-white shadow-pop-orange transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none" type="submit">Prepare enquiry ↗</button>
      {submitted ? (
        <div className="mt-[15px] rounded-[13px] bg-[#e3ecff] p-[15px] text-[13px] text-royal" role="status">
          <strong>Your enquiry details are ready.</strong>
          <p className="mt-[7px] mb-[13px] leading-[1.6]">This starter form does not store or send submissions to a server. Use the email draft below, or connect a form API/backend before publishing.</p>
          <a className="inline-flex items-center justify-center gap-2 rounded-full bg-royal px-5 py-[13px] text-center font-black text-white shadow-pop-royal" href={mailto}>Open email draft ↗</a>
        </div>
      ) : null}
    </form>
  );
}

const fieldClass =
  "w-full rounded-xl border border-[#cfd9f0] bg-white px-[13px] py-3 text-ink outline-none focus:border-royal focus:ring-[3px] focus:ring-royal/10";

function FormRow({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="my-3.5 grid gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-black text-[#2b3b78]">{label}</label>
      {children}
    </div>
  );
}
