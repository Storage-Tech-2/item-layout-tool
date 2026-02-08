import { useEffect, useState } from "react";

type DeferredNumberInputProps = {
  value: number;
  min: number;
  max: number;
  className: string;
  onCommit: (value: string) => void;
};

export function DeferredNumberInput({
  value,
  min,
  max,
  className,
  onCommit,
}: DeferredNumberInputProps) {
  const [draftValue, setDraftValue] = useState(String(value));

  useEffect(() => {
    setDraftValue(String(value));
  }, [value]);

  return (
    <input
      className={className}
      type="number"
      min={min}
      max={max}
      value={draftValue}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={() => onCommit(draftValue)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}
