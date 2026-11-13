import { Link } from 'react-router-dom'
import { UsersRound } from 'lucide-react'
import { SuggestionForm } from '@/components/forms/SuggestionForm'
import { Card } from '@/components/ui/Card'
export function SuggestionContent() {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
      <SuggestionForm />
      <Card className="space-y-6 p-6">
        <UsersRound size={42} className="text-brand" />
        <h2 className="text-2xl font-extrabold">Sua indicação faz diferença</h2>
        <p className="text-muted">
          Ajude a sua cidade a encontrar bons serviços e fortalecer os negócios
          locais.
        </p>
        <ol className="space-y-5">
          {[
            'Conte qual negócio você recomenda.',
            'Nossa equipe confere os dados e entra em contato.',
            'Mais pessoas podem descobrir essa empresa.',
          ].map((text, i) => (
            <li key={text} className="flex items-center gap-3">
              <span className="avatar shrink-0">{i + 1}</span>
              <span className="text-sm text-muted">{text}</span>
            </li>
          ))}
        </ol>
        <div className="border-t border-line pt-5">
          <h3 className="mb-3 font-extrabold">O negócio é seu?</h3>
          <Link to="/entrar?tipo=empresa" className="btn-outline w-full">
            Cadastrar meu negócio
          </Link>
        </div>
      </Card>
    </div>
  )
}
