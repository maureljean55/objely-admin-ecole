"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const CONTROL =
  "w-full rounded-field border bg-white px-3 text-body text-ink outline-none transition-[border-color,box-shadow] placeholder:text-mute focus:border-blue focus:shadow-[0_0_0_3px_rgba(31,99,224,0.2)] disabled:bg-canvas disabled:text-mute";
const tone = (error?: string) => (error ? "border-danger" : "border-line-strong");

function Shell({ id, label, hint, error, required, children }: { id: string; label: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-semibold text-ink">
        {label}
        {required && <span aria-hidden="true" className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-small font-medium text-danger">{error}</p>
      ) : (
        hint && <p className="text-small text-mute">{hint}</p>
      )}
    </div>
  );
}

type Common = { label: string; hint?: string; error?: string };

export function TextField({ label, hint, error, required, className = "", ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error} required={required}>
      <input id={id} required={required} aria-invalid={error ? true : undefined} className={`h-10 ${CONTROL} ${tone(error)} ${className}`} {...props} />
    </Shell>
  );
}

export function SelectField({ label, hint, error, required, children, className = "", ...props }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error} required={required}>
      <select id={id} required={required} className={`h-10 ${CONTROL} ${tone(error)} ${className}`} {...props}>
        {children}
      </select>
    </Shell>
  );
}

export function TextAreaField({ label, hint, error, required, className = "", ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error} required={required}>
      <textarea id={id} required={required} className={`min-h-[88px] resize-y py-2.5 ${CONTROL} ${tone(error)} ${className}`} {...props} />
    </Shell>
  );
}

export function Checkbox({ label, hint, className = "", ...props }: { label: string; hint?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useId();
  return (
    <label htmlFor={id} className={`flex cursor-pointer items-start gap-3 ${className}`}>
      <input id={id} type="checkbox" className="mt-0.5 size-[18px] shrink-0 accent-[#1f63e0]" {...props} />
      <span>
        <span className="block text-body font-medium text-ink">{label}</span>
        {hint && <span className="block text-small text-mute">{hint}</span>}
      </span>
    </label>
  );
}
