import React from "react";

export function BentoGrid({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto ${className}`}
    >
      {children}
    </div>
  );
}

export function BentoGridItem({
  className = "",
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`row-span-1 rounded-2xl group/bento transition duration-200 p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--primary-accent)]/40 hover:shadow-lg flex flex-col justify-between space-y-4 ${className}`}
    >
      {header}
      <div className="group-hover/bento:translate-x-0.5 transition duration-200">
        <div className="mb-2 text-[var(--primary-accent)]">{icon}</div>
        <div className="font-bold text-[var(--text-primary)] text-base mb-1">
          {title}
        </div>
        <div className="font-normal text-[var(--text-secondary)] text-xs leading-relaxed">
          {description}
        </div>
      </div>
    </div>
  );
}
