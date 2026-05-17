import { requireAdmin } from "@/lib/auth/session"
import { ImportExportClient } from "@/components/admin/ImportExportClient"

export default async function PlaybookImportExportPage() {
  await requireAdmin()
  return <ImportExportClient />
}
