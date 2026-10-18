import React from 'react';
import { SearchX } from 'lucide-react';

export default function EmptyState({
  icon: Icon = SearchX,
  title = 'No results found',
  description = 'Try adjusting your search criteria or resetting filters.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-sand-dark p-8 md:p-12 text-center flex flex-col items-center justify-center bg-sand/40 max-w-lg mx-auto my-6">
      <div className="w-16 h-16 rounded-2xl bg-sand-dark/60 text-wine flex items-center justify-center mb-4 shadow-inner">
        <Icon className="w-8 h-8 stroke-[2.2]" />
      </div>
      <h3 className="font-heading text-xl uppercase tracking-tight text-ink mb-2">
        {title}
      </h3>
      <p className="text-sm text-ink/70 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-wine-light"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
