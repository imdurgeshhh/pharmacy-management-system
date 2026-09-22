import React from 'react';
import { Check, X } from 'lucide-react';
import { analyzePassword } from '../../utils/passwordStrength';

/**
 * PasswordStrengthMeter
 *
 * Displays a 3-segment colored strength bar and a short checklist of password
 * criteria. Appears only when `password` has at least 1 character.
 *
 * Aria: The container has aria-live="polite" so screen-reader users hear updates
 * as they type, without interrupting other announcements.
 *
 * Props:
 *   password {string}  — the raw password value from the controlled input
 *   id       {string}  — optional; used by aria-describedby on the password input
 */
const PasswordStrengthMeter = ({ password = '', id }) => {
  const { score, label, colorClass, barColorClass, checks } = analyzePassword(password);

  if (!password) return null;

  const segments = [0, 1, 2]; // 3 segments map to Weak(0) / Fair(1) / Good(2-3)

  return (
    <div
      id={id}
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Password strength: ${label}`}
      className="mt-2 space-y-2"
    >
      {/* ── Strength bar ── */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" role="presentation">
          {segments.map((seg) => (
            <div
              key={seg}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                score > seg
                  ? barColorClass
                  : score === seg && score > 0
                  ? `${barColorClass} opacity-60`
                  : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-semibold w-10 text-right tabular-nums ${colorClass}`}>
          {label}
        </span>
      </div>

      {/* ── Checklist ── */}
      <ul className="space-y-1" aria-label="Password requirements">
        <CheckItem ok={checks.length} label="At least 8 characters" />
        <CheckItem ok={checks.upper && checks.lower} label="Uppercase & lowercase letters" />
        <CheckItem ok={checks.number} label="At least one number" />
        <CheckItem ok={checks.symbol} label="At least one symbol (e.g. !@#$)" />
        <CheckItem ok={checks.noWeakPattern} label="No common patterns or keyboard walks" />
      </ul>

      {/* ── Breach note — always shown ── */}
      <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug">
        Even a "strong" password may be rejected if it appears in a public data breach. Clerk checks this server-side.
      </p>
    </div>
  );
};

/** Single checklist row with pass/fail icon */
const CheckItem = ({ ok, label }) => (
  <li className="flex items-center gap-1.5">
    {ok ? (
      <Check
        size={12}
        className="text-emerald-500 shrink-0"
        aria-hidden="true"
      />
    ) : (
      <X
        size={12}
        className="text-slate-300 dark:text-slate-600 shrink-0"
        aria-hidden="true"
      />
    )}
    <span
      className={`text-[11px] font-medium leading-none ${
        ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
      }`}
    >
      {label}
    </span>
  </li>
);

export default PasswordStrengthMeter;
