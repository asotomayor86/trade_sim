"use client"

import { useRef, useState } from "react"
import type { ImportPreview } from "@/lib/playbook/import-validator"

// ---- Download helper ----
function downloadUrl(url: string, filename: string) {
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
}

function triggerExport(path: string, filename: string) {
  downloadUrl(path, filename)
}

// ---- Preview table section ----
function PreviewSection({ title, rows, colorClass }: {
  title: string
  rows: { code: string; name: string; skipReason?: string; action: string }[]
  colorClass: string
}) {
  if (rows.length === 0) return null
  return (
    <div className="space-y-2">
      <h3 className={`text-xs font-semibold uppercase tracking-wider ${colorClass}`}>{title} ({rows.length})</h3>
      <div className="overflow-hidden rounded border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="px-3 py-2 font-semibold text-slate-500">Código</th>
              <th className="px-3 py-2 font-semibold text-slate-500">Nombre</th>
              {rows[0].skipReason !== undefined && (
                <th className="px-3 py-2 font-semibold text-slate-500">Razón</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-slate-700">{r.code}</td>
                <td className="px-3 py-2 text-slate-600">{r.name}</td>
                {r.skipReason !== undefined && (
                  <td className="px-3 py-2 text-slate-400">{r.skipReason}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ImportExportClient() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [commitLoading, setCommitLoading] = useState(false)
  const [commitResult, setCommitResult] = useState<{ analysesCreated: number; strategiesCreated: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasBlockers = (preview?.errors.length ?? 0) > 0 || !!preview?.limitError

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files ?? []))
    setPreview(null)
    setCommitResult(null)
    setError(null)
  }

  const handlePreview = async () => {
    if (files.length === 0) return
    setPreviewLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      files.forEach((f) => fd.append("file", f))
      const res = await fetch("/api/admin/playbook/import/preview", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error en preview"); return }
      setPreview(data as ImportPreview)
    } catch (e) {
      setError(String(e))
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleCommit = async () => {
    if (!preview || hasBlockers) return
    setCommitLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      files.forEach((f) => fd.append("file", f))
      const res = await fetch("/api/admin/playbook/import/commit", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error en commit"); return }
      setCommitResult(data)
      setPreview(null)
      setFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (e) {
      setError(String(e))
    } finally {
      setCommitLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">IMPORT / EXPORT PLAYBOOK</h1>

      {/* ── Exportación ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Exportar</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => triggerExport("/api/admin/playbook/export/analyses", "analyses.zip")}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ↓ Análisis (.zip)
          </button>
          <button
            onClick={() => triggerExport("/api/admin/playbook/export/strategies", "strategies.zip")}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ↓ Estrategias (.zip)
          </button>
          <button
            onClick={() => triggerExport("/api/admin/playbook/export/all", "playbook.zip")}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            ↓ Exportar todo (.zip)
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Incluye todas las entidades no borradas (análisis estándar y personalizados, estrategias predefinidas y creadas).
        </p>
      </section>

      {/* ── Importación ──────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Importar</h2>

        {commitResult && (
          <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
            Importación completada: {commitResult.analysesCreated} análisis y {commitResult.strategiesCreated} estrategias creados.
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Step 1 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Paso 1 — Seleccionar archivos CSV</p>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv"
              onChange={handleFileChange}
              className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
            <button
              onClick={handlePreview}
              disabled={files.length === 0 || previewLoading}
              className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
            >
              {previewLoading ? "Validando…" : "Validar"}
            </button>
          </div>
          {files.length > 0 && (
            <p className="text-xs text-slate-400">{files.length} archivo{files.length !== 1 ? "s" : ""} seleccionado{files.length !== 1 ? "s" : ""}: {files.map((f) => f.name).join(", ")}</p>
          )}
        </div>

        {/* Preview */}
        {preview && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-700">Paso 2 — Vista previa</h3>

            {/* Limit error */}
            {preview.limitError && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{preview.limitError}</div>
            )}

            {/* Parse/FK errors */}
            {preview.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Errores ({preview.errors.length})</p>
                {preview.errors.map((e, i) => (
                  <div key={i} className="rounded bg-red-50 px-3 py-1.5 text-xs text-red-700">
                    <span className="font-mono font-medium">{e.filename}</span>: {e.message}
                  </div>
                ))}
              </div>
            )}

            <PreviewSection
              title="Análisis a crear"
              rows={preview.analysesToCreate.map((r) => ({ code: r.parsed.code, name: r.parsed.name, action: "create" }))}
              colorClass="text-green-600"
            />
            <PreviewSection
              title="Análisis a ignorar (skip)"
              rows={preview.analysesToSkip.map((r) => ({ code: r.parsed.code, name: r.parsed.name, skipReason: r.skipReason, action: "skip" }))}
              colorClass="text-slate-400"
            />
            <PreviewSection
              title="Estrategias a crear"
              rows={preview.strategiesToCreate.map((r) => ({ code: r.parsed.code, name: r.parsed.name, action: "create" }))}
              colorClass="text-blue-600"
            />
            <PreviewSection
              title="Estrategias a ignorar (skip)"
              rows={preview.strategiesToSkip.map((r) => ({ code: r.parsed.code, name: r.parsed.name, skipReason: r.skipReason, action: "skip" }))}
              colorClass="text-slate-400"
            />

            {!hasBlockers && preview.analysesToCreate.length === 0 && preview.strategiesToCreate.length === 0 && (
              <p className="text-sm text-slate-400">Nada nuevo que importar — todos los códigos ya existen.</p>
            )}

            <button
              onClick={handleCommit}
              disabled={hasBlockers || commitLoading || (preview.analysesToCreate.length === 0 && preview.strategiesToCreate.length === 0)}
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
            >
              {commitLoading ? "Importando…" : `Confirmar importación (${preview.analysesToCreate.length + preview.strategiesToCreate.length} nuevos)`}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
