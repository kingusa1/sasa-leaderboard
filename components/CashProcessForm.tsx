'use client';

import { useState, useCallback } from 'react';
import type { PlanKey } from '@/lib/sheets';

const PLAN_OPTIONS: { key: PlanKey; label: string; color: string; activeColor: string }[] = [
  { key: '3month', label: '3 Months', color: 'text-blue-600 border-blue-200 bg-blue-50', activeColor: 'bg-blue-500 text-white border-blue-500 shadow-md' },
  { key: '6month', label: '6 Months', color: 'text-purple-600 border-purple-200 bg-purple-50', activeColor: 'bg-purple-500 text-white border-purple-500 shadow-md' },
  { key: '12month', label: '12 Months', color: 'text-emerald-600 border-emerald-200 bg-emerald-50', activeColor: 'bg-emerald-500 text-white border-emerald-500 shadow-md' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
        copied
          ? 'bg-green-100 text-green-700 border border-green-300'
          : 'bg-navy-50 text-navy-600 hover:bg-navy-100 border border-navy-200'
      }`}
    >
      {copied ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy Code
        </>
      )}
    </button>
  );
}

interface CashProcessFormProps {
  onSuccess?: () => void;
  salespeople?: string[];
}

export default function CashProcessForm({ onSuccess, salespeople = [] }: CashProcessFormProps) {
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    salesPerson: '',
    plan: '3month' as PlanKey,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    voucherCode?: string;
    error?: string;
  } | null>(null);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/cash-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        onSuccess?.();
      }
    } catch {
      setResult({ success: false, error: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setFormData({
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      salesPerson: '',
      plan: '3month',
    });
    setResult(null);
  }

  // Success state
  if (result?.success) {
    return (
      <div className="text-center py-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-navy-700 mb-1">Voucher Assigned!</h3>
        <p className="text-sm text-gray-500 mb-4">
          The voucher has been assigned to <span className="font-semibold text-navy-600">{formData.clientName}</span>
        </p>

        {/* Voucher code display */}
        <div className="bg-gradient-to-r from-navy-600 to-navy-700 rounded-2xl p-5 mb-4 mx-auto max-w-xs">
          <div className="text-[10px] text-navy-200 uppercase tracking-wider font-medium mb-1">Voucher Code</div>
          <div className="text-2xl font-black text-white tracking-wider mb-3">
            {result.voucherCode}
          </div>
          <div className="flex justify-center">
            <CopyButton text={result.voucherCode!} />
          </div>
        </div>

        {/* Details summary */}
        <div className="bg-gray-50 rounded-xl p-3 text-left text-xs space-y-1.5 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-500">Client</span>
            <span className="font-medium text-navy-700">{formData.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Phone</span>
            <span className="font-medium text-navy-700">{formData.clientPhone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-medium text-navy-700">{formData.clientEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Sales Person</span>
            <span className="font-medium text-navy-700">{formData.salesPerson}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Plan</span>
            <span className="font-medium text-navy-700">
              {PLAN_OPTIONS.find((p) => p.key === formData.plan)?.label}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Type</span>
            <span className="font-semibold text-amber-600">Cash Process</span>
          </div>
        </div>

        <button
          onClick={resetForm}
          className="w-full py-3 bg-navy-600 text-white rounded-xl font-semibold text-sm hover:bg-navy-700 active:scale-[0.98] transition-all shadow-navy"
        >
          Assign Another Voucher
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error alert */}
      {result?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 animate-fade-in">
          {result.error}
        </div>
      )}

      {/* Plan selector */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Select Plan
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PLAN_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => updateField('plan', opt.key)}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95 ${
                formData.plan === opt.key ? opt.activeColor : opt.color
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client Name */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Client Name
        </label>
        <input
          type="text"
          required
          value={formData.clientName}
          onChange={(e) => updateField('clientName', e.target.value)}
          placeholder="Enter client full name"
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm text-navy-700 placeholder:text-gray-400 focus:border-navy-500 focus:bg-white focus:outline-none transition-all"
        />
      </div>

      {/* Client Phone */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Client Phone
        </label>
        <input
          type="tel"
          required
          value={formData.clientPhone}
          onChange={(e) => updateField('clientPhone', e.target.value)}
          placeholder="Enter phone number"
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm text-navy-700 placeholder:text-gray-400 focus:border-navy-500 focus:bg-white focus:outline-none transition-all"
        />
      </div>

      {/* Client Email */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Client Email
        </label>
        <input
          type="email"
          required
          value={formData.clientEmail}
          onChange={(e) => updateField('clientEmail', e.target.value)}
          placeholder="Enter email address"
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm text-navy-700 placeholder:text-gray-400 focus:border-navy-500 focus:bg-white focus:outline-none transition-all"
        />
      </div>

      {/* Sales Person */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Sales Person
        </label>
        <select
          required
          value={formData.salesPerson}
          onChange={(e) => updateField('salesPerson', e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm text-navy-700 focus:border-navy-500 focus:bg-white focus:outline-none transition-all appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
        >
          <option value="" disabled>Select sales person</option>
          {salespeople.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all shadow-navy ${
          submitting
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
            : 'bg-navy-600 text-white hover:bg-navy-700 active:scale-[0.98]'
        }`}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
            </svg>
            Processing...
          </span>
        ) : (
          'Assign Cash Voucher'
        )}
      </button>
    </form>
  );
}
