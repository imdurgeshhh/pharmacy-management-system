import React, { useState, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Canonical FormField component supporting text, email, number, password, textarea,
 * password toggle, icon prefixes, and accessible error messaging.
 */
const FormField = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  hint,
  icon: Icon,
  disabled = false,
  className = '',
  autoComplete = 'off',
  inputMode,
  step,
  min,
  max,
  rows,
  as = 'input',
  children,
  ...props
}) => {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const errorId = `${inputId}-error`;
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const computedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Icon size={18} aria-hidden="true" />
          </div>
        )}

        {as === 'textarea' ? (
          <textarea
            id={inputId}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={rows || 3}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={`w-full rounded-2xl border bg-slate-50/50 dark:bg-slate-800/80 p-3 text-sm text-slate-800 dark:text-slate-100 transition-[border-color,box-shadow,background-color] focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-1 disabled:opacity-50 ${
              error ? 'border-red-400 bg-red-50/30 dark:bg-red-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            } ${Icon ? 'pl-10' : ''}`}
            {...props}
          />
        ) : as === 'select' ? (
          <select
            id={inputId}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={`w-full rounded-2xl border bg-slate-50/50 dark:bg-slate-800/80 p-3 text-sm text-slate-800 dark:text-slate-100 transition-[border-color,box-shadow,background-color] focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-1 disabled:opacity-50 ${
              error ? 'border-red-400 bg-red-50/30 dark:bg-red-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            } ${Icon ? 'pl-10' : ''}`}
            {...props}
          >
            {children}
          </select>
        ) : (
          <input
            id={inputId}
            name={name}
            type={computedType}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            autoComplete={autoComplete}
            inputMode={inputMode}
            step={step}
            min={min}
            max={max}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={`w-full rounded-2xl border bg-slate-50/50 dark:bg-slate-800/80 p-3 text-sm text-slate-800 dark:text-slate-100 transition-[border-color,box-shadow,background-color] focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-1 disabled:opacity-50 ${
              error ? 'border-red-400 bg-red-50/30 dark:bg-red-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            } ${Icon ? 'pl-10' : ''} ${isPassword ? 'pr-11' : ''}`}
            {...props}
          />
        )}

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(prev => !prev)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] rounded-r-2xl"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-500 font-medium animate-shake">
          {error}
        </p>
      )}

      {hint && !error && (
        <p className="text-xs text-slate-500 font-normal">
          {hint}
        </p>
      )}
    </div>
  );
};

export default FormField;
