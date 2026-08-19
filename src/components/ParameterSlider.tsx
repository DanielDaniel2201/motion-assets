type ParameterSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
};

export function ParameterSlider({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: ParameterSliderProps) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="parameter">
      <span className="parameter-label">
        <span>{label}</span>
        <output>{displayValue}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--range-fill": `${fill}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
