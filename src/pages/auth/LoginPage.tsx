import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { BASE_PATH } from '@/lib/utils'
import { useAuth } from '@/context/AuthProvider'
import { BusinessRegistrationForm } from '@/components/forms/BusinessRegistrationForm'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/PageContent'
import { Spinner } from '@/components/ui/Spinner'
function authError(message: string) {
  if (/invalid login credentials/i.test(message))
    return 'E-mail ou senha incorretos. Confira seus dados.'
  if (/email not confirmed/i.test(message))
    return 'Confirme seu e-mail antes de entrar. Confira sua caixa de entrada e o spam.'
  if (/already registered|already been registered/i.test(message))
    return 'Este e-mail já está cadastrado. Use a aba Entrar.'
  if (/rate limit|too many|security purposes/i.test(message))
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.'
  if (/password/i.test(message))
    return 'A senha não atende aos requisitos. Use uma senha mais longa, com letras, números e símbolos.'
  return 'Não foi possível concluir. Confira os dados e tente novamente em instantes.'
}
export function LoginPage() {
  const { user, business, profile, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [method, setMethod] = useState<'password' | 'magic'>('password')
  const [accountType, setAccountType] = useState('morador')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [registerBusiness, setRegisterBusiness] = useState(false)
  const from: unknown = location.state?.from
  const destination =
    typeof from === 'string' &&
    from.startsWith('/') &&
    !from.startsWith('//') &&
    !from.includes('\\') &&
    !from.startsWith('/entrar')
      ? from
      : '/morador/favoritos'
  useEffect(() => {
    if (!user || loading || busy) return
    if (
      !business &&
      (registerBusiness || user.user_metadata.account_type === 'empresa')
    ) {
      setRegisterBusiness(true)
      return
    }
    if (profile?.status === 'suspended') return
    navigate(destination, { replace: true })
  }, [
    user,
    business,
    loading,
    busy,
    registerBusiness,
    destination,
    navigate,
    profile?.status,
  ])
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    setMessage('')
    const emailRedirectTo = `${window.location.origin}${BASE_PATH}/`
    try {
      if (method === 'magic' && tab === 'login') {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo, shouldCreateUser: false },
        })
        if (error) throw error
        setMessage(
          'Link de acesso enviado! Confira sua caixa de entrada e o spam. O envio pode levar alguns minutos; há um limite de mensagens por período.',
        )
      } else if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: String(form.get('password')),
        })
        if (error) throw error
      } else {
        const fullName = String(form.get('full_name')).trim()
        if (!fullName) {
          setError('Informe seu nome.')
          return
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: String(form.get('password')),
          options: {
            emailRedirectTo,
            data: {
              full_name: fullName,
              phone: String(form.get('phone')).trim(),
              account_type: accountType,
            },
          },
        })
        if (error) throw error
        if (data.user?.identities?.length === 0) {
          setMessage(
            'Se este e-mail já estiver cadastrado, entre pela aba Entrar. Caso contrário, confira sua caixa de entrada para confirmar o cadastro.',
          )
          return
        }
        if (data.session) {
          if (accountType === 'empresa') setRegisterBusiness(true)
        } else {
          setMessage(
            `Cadastro recebido! Confirme seu e-mail pelo link enviado à sua caixa de entrada (confira também o spam). ${accountType === 'empresa' ? 'Depois, entre com e-mail e senha para cadastrar sua empresa. ' : ''}O envio pode levar alguns minutos e está sujeito ao limite de e-mails do serviço.`,
          )
          setTab('login')
        }
      }
    } catch (err) {
      setError(
        authError(
          err instanceof Error
            ? err.message
            : String((err as { message?: string })?.message ?? ''),
        ),
      )
    } finally {
      setBusy(false)
    }
  }
  if (loading && !busy) return <Spinner />
  if (user && profile?.status === 'suspended')
    return (
      <div className="mx-auto max-w-lg p-8">
        <Notice error>
          Conta suspensa.{' '}
          {profile.suspension_reason ||
            'Entre em contato com a equipe do Guia Local.'}
        </Notice>
      </div>
    )
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Card className="space-y-6 p-6 md:p-8">
        <div className="text-center">
          <MapPin className="mx-auto mb-3 h-9 w-9 text-brand" />
          <h1 className="text-2xl font-extrabold">
            {user && registerBusiness
              ? 'Cadastre sua empresa'
              : 'Você faz parte do bairro'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {user && registerBusiness
              ? 'Sua conta está pronta. Vamos conhecer seu negócio.'
              : 'Salve seus favoritos, compartilhe experiências e conecte-se.'}
          </p>
        </div>
        {user && registerBusiness ? (
          <BusinessRegistrationForm
            onComplete={() => {
              setRegisterBusiness(false)
              navigate('/empresa-area/painel', { replace: true })
            }}
          />
        ) : (
          <>
            <div
              role="tablist"
              aria-label="Acesso"
              className="grid grid-cols-2 rounded-xl bg-canvas p-1"
            >
              {(['login', 'signup'] as const).map((t) => (
                <button
                  role="tab"
                  aria-selected={tab === t}
                  disabled={busy}
                  key={t}
                  className={`rounded-lg py-2 font-bold ${tab === t ? 'bg-white text-brand shadow-sm' : 'text-muted'}`}
                  onClick={() => {
                    setTab(t)
                    setMethod('password')
                    setError('')
                    setMessage('')
                  }}
                >
                  {t === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>
            {error && <Notice error>{error}</Notice>}
            {message && <Notice>{message}</Notice>}
            <form className="space-y-4" onSubmit={submit}>
              {tab === 'signup' && (
                <>
                  <fieldset>
                    <legend className="mb-2 text-sm font-bold">
                      Como você quer participar?
                    </legend>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'morador', label: 'Sou morador' },
                        { value: 'empresa', label: 'Sou empresa' },
                      ].map((t) => (
                        <label
                          key={t.value}
                          className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${accountType === t.value ? 'border-brand bg-brand-soft' : 'border-line'}`}
                        >
                          <input
                            type="radio"
                            name="account_type"
                            value={t.value}
                            checked={accountType === t.value}
                            onChange={() => setAccountType(t.value)}
                          />
                          {t.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Field label="Nome completo *">
                    <Input
                      aria-label="Nome completo"
                      name="full_name"
                      autoComplete="name"
                      required
                      maxLength={120}
                    />
                  </Field>
                  <Field label="Telefone">
                    <Input
                      aria-label="Telefone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={25}
                    />
                  </Field>
                </>
              )}
              <Field label="E-mail *">
                <Input
                  aria-label="E-mail"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={254}
                />
              </Field>
              {(tab === 'signup' || method === 'password') && (
                <Field
                  label="Senha *"
                  hint={
                    tab === 'signup'
                      ? 'Use pelo menos 8 caracteres.'
                      : undefined
                  }
                >
                  <Input
                    aria-label="Senha"
                    name="password"
                    type="password"
                    required
                    minLength={tab === 'signup' ? 8 : 1}
                    autoComplete={
                      tab === 'signup' ? 'new-password' : 'current-password'
                    }
                  />
                </Field>
              )}
              <Button type="submit" disabled={busy} className="w-full">
                {busy
                  ? 'Aguarde…'
                  : tab === 'signup'
                    ? 'Criar conta'
                    : method === 'magic'
                      ? 'Enviar link de acesso'
                      : 'Entrar'}
              </Button>
            </form>
            {tab === 'login' && (
              <Button
                variant="ghost"
                className="w-full"
                disabled={busy}
                onClick={() => {
                  setMethod(method === 'magic' ? 'password' : 'magic')
                  setError('')
                  setMessage('')
                }}
              >
                <Mail size={17} />
                {method === 'magic'
                  ? 'Entrar com senha'
                  : 'Receber link por e-mail'}
              </Button>
            )}
            <div className="border-t border-line pt-4">
              <Button
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() => {
                  setMessage(
                    'O login com Google ainda não foi configurado. Você pode entrar com seu e-mail e senha ou receber um link de acesso.',
                  )
                  setError('')
                }}
              >
                Continuar com Google
              </Button>
            </div>
          </>
        )}
        <Link
          to="/"
          className="block text-center text-sm font-semibold text-brand"
        >
          Voltar ao Guia Local
        </Link>
      </Card>
    </div>
  )
}
