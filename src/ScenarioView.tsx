import { NATURES, STAT_KEYS, STAT_LABELS, type Scenario } from "./stats";
export function ScenarioView({ scenario }: { scenario: Scenario | null }) {
  if (!scenario)
    return <p>Valores manuales confirmados; no se reconstruyen IV/EV.</p>;
  return (
    <>
      <p>
        Naturaleza: {NATURES.find((n) => n.id === scenario.natureId)?.name}. EV
        totales: {Object.values(scenario.evs).reduce((a, b) => a + b, 0)} / 510.
      </p>
      <div className="scroll">
        <table className="stat-table">
          <thead>
            <tr>
              <th>Estadística</th>
              <th>IV</th>
              <th>EV</th>
              <th>Ficha</th>
            </tr>
          </thead>
          <tbody>
            {STAT_KEYS.map((k) => (
              <tr key={k}>
                <th>{STAT_LABELS[k]}</th>
                <td>{scenario.ivs[k]}</td>
                <td>{scenario.evs[k]}</td>
                <td>{scenario.stats[k]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
