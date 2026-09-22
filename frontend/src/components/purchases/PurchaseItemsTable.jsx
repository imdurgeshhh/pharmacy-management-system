import React, { useState } from 'react';
import { ClipboardList, Edit3, Trash2, Save } from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';
import { SCHEDULE_CONFIG } from '../../utils/scheduleConfig';

const defaultRupee = (n) => `₹${(Number(n) || 0).toFixed(2)}`;

/**
 * Extracted PurchaseItemsTable subcomponent for displaying, editing, and deleting
 * added purchase items in the stock entry flow.
 */
const PurchaseItemsTable = ({
  entries = [],
  editIdx = null,
  onStartEdit,
  onDeleteRow,
  onClearAll,
  onSave,
  saving = false,
  rupee = defaultRupee,
}) => {
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const totalQty = entries.reduce((s, e) => s + (parseFloat(e.qty) || 0), 0);

  return (
    <div className="rounded-2xl bg-white border border-green-100 shadow-md overflow-hidden">
      <div className="px-6 py-3.5 bg-gradient-to-r from-green-800 to-green-700 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-green-100">
            <ClipboardList size={17} aria-hidden="true" />
          </span>
          <h2 className="text-sm font-bold text-white tracking-wide">
            Stock Entry List{entries.length > 0 ? ` (${entries.length})` : ''}
          </h2>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-gray-300">
          <ClipboardList size={44} className="mb-3 opacity-40" aria-hidden="true" />
          <p className="text-sm text-gray-700 font-medium">No entries yet — add medicines above.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto no-scrollbar" tabIndex={0} role="region" aria-label="Stock entry list">
            <table className="w-full text-xs text-left" style={{ minWidth: 950 }}>
              <thead className="bg-green-50 border-b border-green-100 text-green-950 uppercase tracking-wider font-bold">
                <tr>
                  {['#', 'Medicine', 'Schedule', 'Batch', 'Expiry', 'Qty', 'Price', 'GST%', 'Tax', 'Disc%', 'Disc', 'Final', 'Actions'].map(h => (
                    <th key={h} scope="col" className="px-3 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-green-50">
                {entries.map((e, i) => (
                  <tr key={i} className={`transition-colors ${editIdx === i ? 'bg-amber-50' : 'hover:bg-green-50/40'}`}>
                    <td className="px-3 py-2.5 text-gray-600 font-mono tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800 max-w-[140px] truncate" title={e.medicine_name}>{e.medicine_name}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {(() => {
                        const sched = (e.schedule || 'NONE').toUpperCase();
                        const conf = SCHEDULE_CONFIG[sched] || SCHEDULE_CONFIG.NONE;
                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${conf.badgeClass}`}
                            title={`${conf.label}: ${conf.description}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dotClass}`} aria-hidden="true" />
                            {conf.shortLabel}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2.5 font-mono uppercase text-gray-600">{e.batch_number}</td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap tabular-nums">
                      {e.expiry_date
                        ? new Date(e.expiry_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-gray-800 tabular-nums">{e.qty}</td>
                    <td className="px-3 py-2.5 font-mono text-gray-700 tabular-nums">{rupee(e.price)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="bg-orange-50 text-orange-700 border border-orange-100 rounded-md px-1.5 py-0.5 font-semibold tabular-nums">{e.gst_pct}%</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-orange-700 tabular-nums">{rupee(e.tax_amt)}</td>
                    <td className="px-3 py-2.5 text-center text-gray-700 tabular-nums">{e.disc_pct ? `${e.disc_pct}%` : '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-blue-700 tabular-nums">{rupee(e.disc_amt)}</td>
                    <td className="px-3 py-2.5 font-bold text-green-700 font-mono tabular-nums">{rupee(e.final)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => onStartEdit(i)}
                          aria-label={`Edit entry ${i + 1}`}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-[background-color,transform] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <Edit3 size={13} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmIdx(i)}
                          aria-label={`Delete entry ${i + 1}`}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-[background-color,transform] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Toolbar */}
          <div className="px-6 py-4 border-t border-green-100 bg-green-50/30 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-700">
              <span className="font-bold text-gray-800 tabular-nums">{entries.length}</span> medicine{entries.length > 1 ? 's' : ''} ·{' '}
              Total qty: <span className="font-bold tabular-nums">{totalQty}</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-white border-2 border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 active:scale-[0.96] transition-[background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
              >
                <Trash2 size={15} aria-hidden="true" /> Clear All
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-6 py-2 min-h-[44px] rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 shadow-md shadow-green-200 active:scale-[0.96] transition-[background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                <Save size={15} aria-hidden="true" /> {saving ? 'Saving…' : 'Save Stock Entry'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Single Entry Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirmIdx !== null}
        title="Remove Item Entry?"
        message="Are you sure you want to remove this item from the current purchase entry?"
        confirmLabel="Remove Item"
        onConfirm={() => {
          onDeleteRow(deleteConfirmIdx);
          setDeleteConfirmIdx(null);
        }}
        onCancel={() => setDeleteConfirmIdx(null)}
      />

      {/* Clear All Confirmation */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear All Entries?"
        message="This will discard all added items in the current stock entry."
        confirmLabel="Clear All"
        onConfirm={() => {
          onClearAll();
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};

export default PurchaseItemsTable;
