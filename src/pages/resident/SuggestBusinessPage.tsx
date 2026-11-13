import { PageContent } from '@/components/PageContent'
import { SuggestionForm } from '@/components/forms/SuggestionForm'
export function SuggestBusinessPage() {
  return (
    <PageContent
      title="Indicar empresa"
      description="Ajude outras pessoas a descobrir bons serviços na sua região."
    >
      <SuggestionForm />
    </PageContent>
  )
}
