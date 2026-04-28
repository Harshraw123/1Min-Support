import { Link2 } from "lucide-react";

export default function StepInput({
  step,
  value,
  error,
  placeholder,
  onChange,
  onEnter,
}: any) {
  if (step === 3) {
    return (
      <div className="relative mt-12">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border-b-2 bg-transparent text-xl"
        />
        <Link2 className="absolute right-2 top-3 h-5 w-5" />
      </div>
    );
  }

  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onEnter()}
      placeholder={placeholder}
      className={`w-full border-b-2 text-xl ${
        error ? "border-red-500" : "border-gray-300"
      }`}
    />
  );
}