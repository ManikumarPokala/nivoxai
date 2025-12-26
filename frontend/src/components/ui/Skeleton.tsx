import type { HTMLAttributes } from "react";
import { cn } from "./utils";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export default function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-slate-200/70", className)}
      {...props}
    />
  );
}
