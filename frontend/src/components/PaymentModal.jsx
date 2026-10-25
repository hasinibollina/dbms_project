import React, { useEffect, useState } from 'react';
import { X, Smartphone, CreditCard, Landmark, Wallet, Minus, Plus, Loader2 } from 'lucide-react';

const METHODS = [
  { id: 'UPI', label: 'UPI', hint: 'GPay, PhonePe, Paytm', Icon: Smartphone },
  { id: 'Credit Card', label: 'Credit Card', hint: 'Visa, Mastercard, RuPay', Icon: CreditCard },
  { id: 'Debit Card', label: 'Debit Card', hint: 'All major banks', Icon: CreditCard },
  { id: 'Net Banking', label: 'Net Banking', hint: 'Pay from your bank account', Icon: Landmark },
  { id: 'Wallet', label: 'Wallet', hint: 'Paytm, Amazon Pay', Icon: Wallet },
];

/**
 * Payment popup: shows the event, ticket quantity and total amount.
 * Clicking a payment method calls onPay(methodId, quantity).
 */
export default function PaymentModal({ event, remaining, isProcessing, onPay, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [activeMethod, setActiveMethod] = useState(null);

  const price = Number(event?.ticket_price ?? event?.price ?? 0);
  const total = price * quantity;
  const maxQty = Math.max(1, Math.min(10, remaining ?? 10));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !isProcessing) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isProcessing, onClose]);

  if (!event) return null;

  const handlePick = (id) => {
    if (isProcessing) return;
    setActiveMethod(id);
    onPay(id, quantity);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-sand text-ink rounded-2xl max-w-md w-full border border-sand-dark shadow-poster p-6 relative">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 text-ink/50 hover:text-ink p-1 rounded-lg"
          aria-label="Close payment"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-heading text-lg uppercase tracking-tight">Complete Payment</h3>
        <p className="text-xs text-ink/70 mt-1 truncate">{event.title} · {event.venue}</p>

        <div className="flex items-center justify-between mt-5 bg-sand-dark/40 rounded-xl px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">Tickets</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isProcessing || quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-7 h-7 rounded-lg border border-sand-dark flex items-center justify-center disabled:opacity-40"
              aria-label="Fewer tickets"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold w-5 text-center">{quantity}</span>
            <button
              type="button"
              disabled={isProcessing || quantity >= maxQty}
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              className="w-7 h-7 rounded-lg border border-sand-dark flex items-center justify-center disabled:opacity-40"
              aria-label="More tickets"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">Total amount</span>
          <span className="font-heading text-2xl text-wine">
            {total > 0 ? `₹${total.toLocaleString('en-IN')}` : 'FREE'}
          </span>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/60 mt-5 mb-2">
          Choose a payment method
        </p>
        <div className="flex flex-col gap-2">
          {METHODS.map(({ id, label, hint, Icon }) => (
            <button
              key={id}
              type="button"
              disabled={isProcessing}
              onClick={() => handlePick(id)}
              className="flex items-center gap-3 text-left px-4 py-3 rounded-xl border border-sand-dark bg-white/40 hover:bg-wine/10 hover:border-wine transition-colors disabled:opacity-60 disabled:cursor-wait"
            >
              <span className="w-9 h-9 rounded-lg bg-wine/10 text-wine flex items-center justify-center">
                {isProcessing && activeMethod === id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-[11px] text-ink/60">{hint}</span>
              </span>
              <span className="text-[11px] font-heading uppercase text-wine">
                {isProcessing && activeMethod === id ? 'Paying…' : 'Pay'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
