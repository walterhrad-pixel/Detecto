export const SAMPLES = Array.from({ length: 12 }, (_, i) => `frame${String(i + 1).padStart(2, "0")}.jpg`);

export default function SamplePicker({ active, disabled, onPick }) {
  return (
    <div className="samples" role="list" aria-label="Sample images">
      {SAMPLES.map((name) => (
        <button
          key={name}
          type="button"
          role="listitem"
          className={`sample${active === name ? " is-active" : ""}`}
          disabled={disabled}
          onClick={() => onPick(name)}
          title={name}
        >
          <img src={`/samples/${name}`} alt={name} loading="lazy" />
        </button>
      ))}
    </div>
  );
}
