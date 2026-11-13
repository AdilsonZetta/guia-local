import { PageContent } from '@/components/PageContent'
import { SuggestionContent } from '@/components/SuggestionContent'
export function SuggestBusinessPage() {
  return (
    <PageContent
      title="Indicar empresa"
      description="Ajude outras pessoas a descobrir bons serviços na sua região."
    >
      <SuggestionContent />
    </PageContent>
  )
}
