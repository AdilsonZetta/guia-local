import { PageContent } from '@/components/PageContent'
import { SuggestionContent } from '@/components/SuggestionContent'
export function SuggestPage() {
  return (
    <PageContent
      title="Indique uma empresa"
      description="Conhece um negócio que merece estar aqui? Compartilhe sua indicação com a gente."
    >
      <SuggestionContent />
    </PageContent>
  )
}
