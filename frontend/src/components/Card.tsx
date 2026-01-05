import type { PropsWithChildren } from "react";

export default function Card({ children }: PropsWithChildren) {
  return <div className="rounded-lg border bg-white p-4 shadow-sm">{children}</div>;
}
