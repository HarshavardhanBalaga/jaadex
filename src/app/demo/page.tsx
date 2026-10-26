import type { Metadata } from "next";
import { Demo } from "@/components/Demo";

export const metadata: Metadata = {
  title: "Try JaaDeX",
  description: "Explore a JaaDeX demo experience and see how animation, storytelling and creative technology bring learning to life.",
};

export default function DemoPage() {
  return <Demo />;
}
