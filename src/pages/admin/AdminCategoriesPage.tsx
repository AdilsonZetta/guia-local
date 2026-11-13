import { PageContent } from '@/components/PageContent'
import { ManagedCatalog } from '@/components/ManagedCatalog'
export function AdminCategoriesPage() {
  return (
    <PageContent title="Categorias">
      <ManagedCatalog table="categories" title="Categorias do guia" />
    </PageContent>
  )
}
