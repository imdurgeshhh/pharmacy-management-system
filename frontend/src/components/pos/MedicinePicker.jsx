import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const fmt = (n) => `₹${(Number(n) || 0).toFixed(2)}`;

/**
 * Accessible medicine autocomplete picker.
 *
 * The suggestion list is rendered via a React Portal attached to document.body
 * so it is never clipped by ancestor overflow:hidden / overflow-x-auto
 * containers (e.g. the scrollable billing table).
 *
 * Position is computed from the input's bounding rect on every open/scroll/
 * resize event so it tracks correctly even when the page scrolls.
 */
const MedicinePicker = ({
  id,
  name,
  value,
  onChange,
  onSelect,
  inventory = [],
  className = '',
  ariaLabel = 'Medicine name',
  ariaLabelledBy,
  placeholder = 'Medicine name…',
}) => {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Recompute dropdown position whenever it opens or the window scrolls/resizes
  const reposition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 2,
      left: rect.left,
      width: Math.max(rect.width, 220),
      zIndex: 9999,
    });
  };

  useEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  // Close on click-outside (covers both the input and the portal dropdown)
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (inputRef.current && inputRef.current.contains(e.target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      setOpen(false);
      setActiveIdx(-1);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);
  // Close on Escape key (covers window-level and input-level dispatch)
  useEffect(() => {
    if (!open) return;
    const handleWindowKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setActiveIdx(-1);
      }
    };
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [open]);

  const hits = value && value.trim().length > 0
    ? inventory
        .filter(m => (m.label || '').toLowerCase().includes(value.toLowerCase()))
        .slice(0, 8)
    : [];

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIdx(-1);
  }, [value]);

  // Keyboard navigation on input
  const handleKeyDown = (e) => {
    if (!open || hits.length === 0) {
      if (e.key === 'ArrowDown' && hits.length > 0) {
        setOpen(true);
        setActiveIdx(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(prev => (prev + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(prev => (prev - 1 + hits.length) % hits.length);
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && activeIdx < hits.length) {
        e.preventDefault();
        onSelect(hits[activeIdx]);
        setOpen(false);
        setActiveIdx(-1);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  const dropdown = open && hits.length > 0
    ? createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-white border border-green-200 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto"
          role="listbox"
          aria-label="Medicine suggestions"
        >
          {hits.map((m, i) => {
            const isSelected = activeIdx === i;
            return (
              <button
                key={m.id || i}
                id={`med-opt-${i}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep input focused through selection
                  onSelect(m);
                  setOpen(false);
                  setActiveIdx(-1);
                }}
                className={`w-full text-left px-3 py-2 text-xs border-b border-gray-100 last:border-0 text-gray-800 font-medium focus-visible:outline-none flex items-center justify-between gap-2 transition-colors ${
                  isSelected ? 'bg-green-100 text-green-950 font-bold' : 'hover:bg-green-50'
                }`}
              >
                <span className="truncate">{m.label}</span>
                <span className="flex-shrink-0 flex flex-col items-end">
                  {((m.selling_price || m.mrp) > 0) && (
                    <span className="text-green-800 font-bold tabular-nums">{fmt(m.selling_price || m.mrp)}</span>
                  )}
                  {m.stock_qty !== undefined && (
                    <span className="text-gray-600 text-[10px] font-medium tabular-nums">Qty: {m.stock_qty}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        name={name}
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-expanded={open && hits.length > 0}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-activedescendant={activeIdx >= 0 ? `med-opt-${activeIdx}` : undefined}
        role="combobox"
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          reposition();
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        className={className}
      />
      {dropdown}
    </>
  );
};

export default MedicinePicker;
