export function TestEmptyState({ icon, heading, subtitle }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white h-full">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-neutral-50 flex items-center justify-center border border-neutral-100 shadow-sm">
          <div className="text-neutral-500 [&>svg]:w-6 [&>svg]:h-6">
            {icon}
          </div>
        </div>
        <h3 className="text-base font-medium text-neutral-900 mb-1">{heading}</h3>
        <p className="text-sm text-neutral-500 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}
