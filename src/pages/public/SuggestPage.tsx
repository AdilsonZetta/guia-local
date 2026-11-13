import { PageContent } from '@/components/PageContent'
import { SuggestionForm } from '@/components/forms/SuggestionForm'
export function SuggestPage() {
  return (
    <PageContent
      title="Indique uma empresa"
      description="Conhece um negócio que merece estar aqui? Compartilhe sua indicação com a gente."
    >
      <SuggestionForm />
    </PageContent>
  )
}
