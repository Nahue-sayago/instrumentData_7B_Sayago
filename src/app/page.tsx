"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AudioLines,
  Check,
  ChevronDown,
  CircleAlert,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Instrument = {
  id: number;
  person_name: string;
  instrument_name: string;
  part_number: string;
  serial_number: string;
  photo_url: string;
  created_at: string;
  updated_at: string;
};

type FormValues = Pick<Instrument, "person_name" | "instrument_name" | "part_number" | "serial_number">;

const emptyValues: FormValues = {
  person_name: "",
  instrument_name: "",
  part_number: "",
  serial_number: "",
};

export default function Home() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Instrument | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/instruments")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar el inventario.");
        if (active) setInstruments(data);
      })
      .catch((error: Error) => {
        if (active) setLoadError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const filteredInstruments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    if (!normalizedQuery) return instruments;
    return instruments.filter((instrument) =>
      [instrument.person_name, instrument.instrument_name, instrument.part_number, instrument.serial_number]
        .some((value) => value.toLocaleLowerCase("es").includes(normalizedQuery)),
    );
  }, [instruments, query]);

  const peopleCount = new Set(instruments.map((instrument) => instrument.person_name.toLocaleLowerCase("es"))).size;

  function openCreateForm() {
    setEditing(null);
    setValues(emptyValues);
    setPhoto(null);
    setFormError("");
    setModalOpen(true);
  }

  function openEditForm(instrument: Instrument) {
    setEditing(instrument);
    setValues({
      person_name: instrument.person_name,
      instrument_name: instrument.instrument_name,
      part_number: instrument.part_number,
      serial_number: instrument.serial_number,
    });
    setPhoto(null);
    setFormError("");
    setModalOpen(true);
  }

  function updateField(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function saveInstrument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const body = new FormData();
    Object.entries(values).forEach(([key, value]) => body.append(key, value));
    if (photo) body.append("photo", photo);

    try {
      const response = await fetch(editing ? `/api/instruments/${editing.id}` : "/api/instruments", {
        method: editing ? "PUT" : "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el registro.");

      if (editing) {
        setInstruments((current) => current.map((item) => item.id === data.id ? data : item));
      } else {
        setInstruments((current) => [data, ...current]);
      }
      setNotice(editing ? "Instrumento actualizado." : "Instrumento agregado al inventario.");
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteInstrument(instrument: Instrument) {
    const confirmed = window.confirm(`¿Eliminar ${instrument.instrument_name} (${instrument.serial_number})?`);
    if (!confirmed) return;

    setBusyId(instrument.id);
    try {
      const response = await fetch(`/api/instruments/${instrument.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo eliminar el registro.");
      setInstruments((current) => current.filter((item) => item.id !== instrument.id));
      setNotice("Registro eliminado.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo eliminar el registro.");
    } finally {
      setBusyId(null);
    }
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    setPhoto(event.target.files?.[0] ?? null);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Pulso, inicio">
          <span className="brand-mark"><AudioLines size={21} strokeWidth={2.2} /></span>
          <span className="brand-word">pulso<span>.</span></span>
        </Link>
        <div className="topbar-divider" />
        <span className="topbar-section">Control de activos</span>
        <div className="topbar-right">
          <span className="system-status"><i /> Inventario activo</span>
          <span className="user-mark" aria-label="Área de servicio">S</span>
        </div>
      </header>

      <section className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ÁREA DE SERVICIO <span>/</span> ACTIVOS</p>
            <h1>Instrumentos</h1>
            <p className="heading-copy">Registro y asignación del equipo de medición.</p>
          </div>
          <button className="button button-primary" onClick={openCreateForm}>
            <Plus size={17} /> <span>Agregar instrumento</span>
          </button>
        </div>

        <div className="overview" aria-label="Resumen del inventario">
          <div className="overview-item">
            <span className="overview-label">INSTRUMENTOS REGISTRADOS</span>
            <strong>{instruments.length.toString().padStart(2, "0")}</strong>
          </div>
          <div className="overview-rule" />
          <div className="overview-item">
            <span className="overview-label">PERSONAS RESPONSABLES</span>
            <strong>{peopleCount.toString().padStart(2, "0")}</strong>
          </div>
          <div className="overview-note"><span className="live-dot" /> Datos sincronizados</div>
        </div>

        <section className="inventory-panel" aria-labelledby="inventory-title">
          <div className="panel-toolbar">
            <div className="panel-title-wrap">
              <h2 id="inventory-title">Inventario</h2>
              <span className="record-count">{filteredInstruments.length} {filteredInstruments.length === 1 ? "registro" : "registros"}</span>
            </div>
            <label className="search-box">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                placeholder="Buscar por nombre, parte o serie"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Buscar instrumentos"
              />
            </label>
          </div>

          {loadError && (
            <div className="notice notice-error" role="alert">
              <CircleAlert size={17} />
              <span>{loadError}</span>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <Check size={16} /> <span>{notice}</span>
              <button onClick={() => setNotice("")} aria-label="Cerrar aviso"><X size={15} /></button>
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th-instrument">INSTRUMENTO</th>
                  <th>NÚMERO DE SERIE</th>
                  <th>RESPONSABLE</th>
                  <th className="th-updated">ACTUALIZADO</th>
                  <th><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="state-cell" colSpan={5}><LoaderCircle className="spin" size={20} /> Cargando inventario...</td></tr>
                ) : filteredInstruments.length ? filteredInstruments.map((instrument) => (
                  <tr key={instrument.id}>
                    <td data-label="Instrumento">
                      <div className="instrument-cell">
                        <div className="instrument-photo"><Image src={instrument.photo_url} alt={`Foto de ${instrument.instrument_name}`} width={45} height={45} unoptimized /></div>
                        <div className="instrument-copy">
                          <strong>{instrument.instrument_name}</strong>
                          <span>PARTE <b>{instrument.part_number}</b></span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Número de serie"><span className="serial-number">{instrument.serial_number}</span></td>
                    <td data-label="Responsable"><span className="person-name"><i>{instrument.person_name.slice(0, 1).toLocaleUpperCase("es")}</i>{instrument.person_name}</span></td>
                    <td data-label="Actualizado" className="updated-cell">{new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(instrument.updated_at))}</td>
                    <td data-label="Acciones">
                      <div className="row-actions">
                        <button className="icon-button" onClick={() => openEditForm(instrument)} aria-label={`Editar ${instrument.instrument_name}`} title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button className="icon-button icon-danger" onClick={() => deleteInstrument(instrument)} disabled={busyId === instrument.id} aria-label={`Eliminar ${instrument.instrument_name}`} title="Eliminar">
                          {busyId === instrument.id ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div className="empty-icon"><AudioLines size={23} /></div>
                        <strong>{query ? "Sin resultados" : "Aún no hay instrumentos"}</strong>
                        <p>{query ? "Prueba con otro nombre, número de parte o serie." : "Agrega el primer equipo para comenzar el inventario."}</p>
                        {!query && <button className="button button-secondary" onClick={openCreateForm}><Plus size={16} /> Agregar instrumento</button>}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="panel-footer">
            <span><span className="footer-led" /> BASE DE ACTIVOS</span>
            <span>VISTA GENERAL <b>{filteredInstruments.length.toString().padStart(2, "0")}</b></span>
          </footer>
        </section>
        <p className="page-footnote">PULSO <span>·</span> GESTIÓN DE EQUIPO <span>·</span> {new Date().getFullYear()}</p>
      </section>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">FICHA DE ACTIVO</p>
                <h2 id="modal-title">{editing ? "Editar instrumento" : "Nuevo instrumento"}</h2>
              </div>
              <button className="icon-button modal-close" onClick={() => setModalOpen(false)} aria-label="Cerrar formulario"><X size={19} /></button>
            </div>
            <form onSubmit={saveInstrument}>
              <div className="form-grid">
                <label className="field field-wide">
                  <span>Nombre de la persona <b>*</b></span>
                  <input value={values.person_name} onChange={(event) => updateField("person_name", event.target.value)} maxLength={120} required autoFocus placeholder="Nombre y apellido" />
                </label>
                <label className="field field-wide">
                  <span>Nombre del instrumento <b>*</b></span>
                  <input value={values.instrument_name} onChange={(event) => updateField("instrument_name", event.target.value)} maxLength={120} required placeholder="Ej. Multímetro digital" />
                </label>
                <label className="field">
                  <span>Número de parte <b>*</b></span>
                  <input value={values.part_number} onChange={(event) => updateField("part_number", event.target.value)} maxLength={80} required placeholder="Ej. 87V-MAX" />
                </label>
                <label className="field">
                  <span>Número de serie <b>*</b></span>
                  <input value={values.serial_number} onChange={(event) => updateField("serial_number", event.target.value)} maxLength={80} required placeholder="Ej. 49281736" />
                </label>
                <div className="field field-wide">
                  <span>Fotografía <b>*</b></span>
                  <label className={`upload-box ${photoPreview || editing?.photo_url ? "has-photo" : ""}`}>
                    {photoPreview || editing?.photo_url ? (
                      <>
                        <Image src={photoPreview || editing?.photo_url || ""} alt="Vista previa del instrumento" width={48} height={48} unoptimized />
                        <span className="upload-copy"><strong>{photo ? photo.name : "Foto actual"}</strong><small>Haz clic para reemplazarla · máximo 5 MB</small></span>
                        <span className="upload-change">Cambiar</span>
                      </>
                    ) : (
                      <>
                        <span className="upload-icon"><ImagePlus size={21} /></span>
                        <span className="upload-copy"><strong>Seleccionar una fotografía</strong><small>JPG, PNG o WEBP · máximo 5 MB</small></span>
                        <ChevronDown className="upload-arrow" size={17} />
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handlePhotoChange} required={!editing} />
                  </label>
                </div>
              </div>
              {formError && <p className="form-error" role="alert"><CircleAlert size={16} />{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="button button-quiet" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="button button-primary" disabled={saving}>
                  {saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Agregar al inventario"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}