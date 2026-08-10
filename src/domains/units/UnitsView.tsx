import { Plus } from "lucide-react";
import { FormEvent } from "react";
import { origins } from "./rules";
import { Origin, Unit } from "./types";

export interface UnitFormState extends Omit<Unit, "active"> {}

export function UnitsView(props: {
  units: Unit[];
  canManage: boolean;
  unitForm: UnitFormState;
  onUnitFormChange: (form: UnitFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { units, canManage, unitForm, onUnitFormChange, onSubmit } = props;

  return (
    <section className="units-layout">
      <div className="panel">
        <div className="panel-heading">
          <h2>Unidades escolares e setores</h2>
          <span>{units.length} cadastrados</span>
        </div>
        <div className="unit-grid">
          {units.map((unit) => (
            <article className="unit-card" key={unit.id}>
              <strong>{unit.name}</strong>
              <span>{unit.code}</span>
              <em>{unit.origin}</em>
            </article>
          ))}
        </div>
      </div>
      {canManage && (
        <form className="panel unit-form" onSubmit={onSubmit}>
          <div className="panel-heading">
            <h2>Novo cadastro</h2>
            <span>Escola ou setor</span>
          </div>
          <label>
            Nome
            <input
              value={unitForm.name}
              onChange={(event) => onUnitFormChange({ ...unitForm, name: event.target.value })}
              required
            />
          </label>
          <label>
            Código
            <input
              value={unitForm.code}
              onChange={(event) => onUnitFormChange({ ...unitForm, code: event.target.value })}
              required
            />
          </label>
          <label>
            Origem
            <select
              value={unitForm.origin}
              onChange={(event) => onUnitFormChange({ ...unitForm, origin: event.target.value as Origin })}
            >
              {origins.map((origin) => (
                <option key={origin}>{origin}</option>
              ))}
            </select>
          </label>
          <button className="primary-action" type="submit">
            <Plus size={18} /> Salvar unidade
          </button>
        </form>
      )}
    </section>
  );
}
