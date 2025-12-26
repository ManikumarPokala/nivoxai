import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

type TableProps = HTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
};

type TableSectionProps = HTMLAttributes<HTMLTableSectionElement> & {
  children: ReactNode;
};

type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  children: ReactNode;
};

type TableCellProps = HTMLAttributes<HTMLTableCellElement> & {
  children: ReactNode;
};

export function Table({ className, children, ...props }: TableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className={cn("w-full text-left text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className, children, ...props }: TableSectionProps) {
  return (
    <thead
      className={cn(
        "bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500",
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }: TableSectionProps) {
  return (
    <tbody className={cn("divide-y divide-slate-100", className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }: TableRowProps) {
  return (
    <tr className={cn("bg-white", className)} {...props}>
      {children}
    </tr>
  );
}

export function TableCell({ className, children, ...props }: TableCellProps) {
  return (
    <td className={cn("px-4 py-3", className)} {...props}>
      {children}
    </td>
  );
}
