export default function Input({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-3 block text-sm font-semibold tracking-wide text-slate-200">
          {label}
        </span>
      )}

      <input
        className={`
          w-full
          rounded-2xl
          border
          border-white/15
          bg-white/5
          px-5
          py-4
          text-base
          text-white
          placeholder:text-slate-400
          backdrop-blur-md
          outline-none
          transition-all
          duration-300
          focus:border-green-400
          focus:bg-white/10
          focus:ring-4
          focus:ring-green-500/20
          ${className}
        `}
        {...props}
      />
    </label>
  )
}