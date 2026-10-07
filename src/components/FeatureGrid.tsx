import type { ReactNode } from "react";

const columnClasses = {
  3: "md:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
};

export function FeatureGrid({ children, columns = 3 }: { children: ReactNode; columns?: 3 | 4 }) {
  return <div className={`grid grid-cols-1 gap-[17px] ${columnClasses[columns]}`}>{children}</div>;
}
