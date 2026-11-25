import { colorRoles } from '../engine/colorRoles';

/** Phase 0 placeholder. It shows no dimensions: those only ever come from the engine. */
export function App() {
  return (
    <main>
      <header>
        <img src="./icons/icon.svg" alt="" width="72" height="72" />
        <h1>Build by Piece</h1>
      </header>

      <p className="lead">
        A few measurements in. A complete, checked woodworking plan out: shopping list, cut list,
        cutting diagrams and step-by-step pictures.
      </p>

      <section aria-labelledby="status">
        <h2 id="status">Where things stand</h2>
        <p>
          <strong>Phase 0: foundation.</strong> The construction rules are written and waiting for
          review. The plan builder comes next.
        </p>
      </section>

      <section aria-labelledby="colors">
        <h2 id="colors">The colours you will see</h2>
        <p>Every piece keeps the same colour on every page, and always shows its part number too.</p>
        <ul className="roles">
          {colorRoles.map((c) => (
            <li key={c.role} style={{ background: c.hex, color: c.textHex }}>
              <span>{c.label}</span>
              <span className="colorName">{c.colorName}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="install">
        <h2 id="install">Add it to your iPhone home screen</h2>
        <ol>
          <li>Open this page in Safari.</li>
          <li>Tap the Share button.</li>
          <li>Tap “Add to Home Screen”, then “Add”.</li>
        </ol>
      </section>
    </main>
  );
}
