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
  const companySignup =
    new URLSearchParams(location.search).get('tipo') === 'empresa'
  const [tab, setTab] = useState<'login' | 'signup'>(
    companySignup ? 'signup' : 'login',
  )
  const [accountType, setAccountType] = useState(
    companySignup ? 'empresa' : 'morador',
  )
  const [email, setEmail] = useState('')
  const [recovery, setRecovery] = useState(() =>
    window.location.hash.includes('type=recovery'),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [registerBusiness, setRegisterBusiness] = useState(false)
  const from: unknown =
    location.state?.from || new URLSearchParams(location.search).get('retorno')
  const destination =
    typeof from === 'string' &&
    from.startsWith('/') &&
    !from.startsWith('//') &&
    !from.includes('\\') &&
    !from.startsWith('/entrar')
      ? from
      : '/morador/favoritos'
  useEffect(() => {
    if (companySignup) {
      setTab('signup')
      setAccountType('empresa')
    }
  }, [companySignup])
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (
      !user ||
      loading ||
      busy ||
      recovery ||
      window.location.hash.includes('type=recovery')
    )
      return
    if (
      !business &&
      (registerBusiness ||
        companySignup ||
        user.user_metadata.account_type === 'empresa')
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
    companySignup,
    recovery,
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
    const emailRedirectTo = `${window.location.origin}${BASE_PATH}/entrar?retorno=${encodeURIComponent(destination)}`
    try {
      if (tab === 'login') {
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
    <div className="login-stage site-container grid items-stretch gap-8 py-10 lg:grid-cols-2">
      <section className="login-story relative overflow-hidden p-8 md:p-12">
        <MapPin className="mb-8 h-14 w-14 text-brand" />
        <h2 className="text-4xl font-extrabold md:text-5xl">
          Sua cidade tem boas indicações.
        </h2>
        <p className="mt-5 text-xl text-muted">
          Encontre quem resolve, perto de você.
        </p>
        <div className="mt-10 space-y-6">
          {[
            'Descubra empresas e profissionais da sua região.',
            'Salve seus favoritos e fale diretamente com os negócios.',
            'Compartilhe experiências que ajudam outras pessoas.',
          ].map((text, i) => (
            <p key={text} className="flex items-center gap-4">
              <span className="avatar !bg-white">{i + 1}</span>
              {text}
            </p>
          ))}
        </div>
      </section>
      <Card className="login-card space-y-6 p-6 md:p-8">
        <div className="text-center">
          <MapPin className="mx-auto mb-3 h-9 w-9 text-brand" />
          <h1 className="text-2xl font-extrabold">
            {user && registerBusiness
              ? 'Cadastre sua empresa'
              : 'Entrar ou criar conta'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {user && registerBusiness
              ? 'Sua conta está pronta. Vamos conhecer seu negócio.'
              : 'Salve seus favoritos, compartilhe experiências e conecte-se.'}
          </p>
        </div>
        {recovery ? (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              setError('')
              const password = String(
                new FormData(e.currentTarget).get('new_password'),
              )
              const result = await supabase.auth.updateUser({ password })
              setBusy(false)
              if (result.error) setError(authError(result.error.message))
              else {
                setRecovery(false)
                navigate(destination, { replace: true })
              }
            }}
          >
            <h2 className="text-xl font-extrabold">Definir nova senha</h2>
            {error && <Notice error>{error}</Notice>}
            <Field label="Nova senha">
              <Input
                type="password"
                name="new_password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </Field>
            <Button type="submit" disabled={busy}>
              Salvar nova senha
            </Button>
          </form>
        ) : user && registerBusiness ? (
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
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setMessage(
                  'O login com Google ainda não foi configurado. Use seu e-mail para continuar.',
                )
                setError('')
              }}
            >
              Continuar com Google
            </Button>
            <div className="flex items-center gap-4 text-sm text-muted">
              <span className="h-px flex-1 bg-line" />
              ou continue com e-mail
              <span className="h-px flex-1 bg-line" />
            </div>
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
              {
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
              }
              <Button type="submit" disabled={busy} className="w-full">
                {busy
                  ? 'Aguarde…'
                  : tab === 'signup'
                    ? 'Criar conta'
                    : 'Entrar'}
              </Button>
            </form>
            {tab === 'login' && (
              <Button
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={async () => {
                  setError('')
                  setMessage('')
                  if (
                    !email.trim() ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                  ) {
                    setError('Informe um e-mail válido para receber o link.')
                    return
                  }
                  setBusy(true)
                  const result = await supabase.auth.signInWithOtp({
                    email: email.trim(),
                    options: {
                      emailRedirectTo: `${window.location.origin}${BASE_PATH}/entrar?retorno=${encodeURIComponent(destination)}`,
                      shouldCreateUser: false,
                    },
                  })
                  setBusy(false)
                  if (result.error) setError(authError(result.error.message))
                  else
                    setMessage(
                      'Link de acesso enviado! Confira sua caixa de entrada e o spam.',
                    )
                }}
              >
                <Mail size={18} />
                Enviar link de acesso
              </Button>
            )}
            {tab === 'login' && (
              <button
                type="button"
                disabled={busy}
                className="w-full text-sm font-bold text-brand underline"
                onClick={async () => {
                  setError('')
                  if (!email.trim()) {
                    setError(
                      'Informe seu e-mail para receber o link de recuperação.',
                    )
                    return
                  }
                  setBusy(true)
                  const result = await supabase.auth.resetPasswordForEmail(
                    email.trim(),
                    {
                      redirectTo: `${window.location.origin}${BASE_PATH}/entrar`,
                    },
                  )
                  setBusy(false)
                  if (result.error) setError(authError(result.error.message))
                  else
                    setMessage(
                      'Enviamos um link para redefinir sua senha. Confira seu e-mail.',
                    )
                }}
              >
                Esqueci minha senha
              </button>
            )}
            <p className="text-center text-xs text-muted">
              Ao continuar, você concorda em usar o Guia Local com respeito à
              comunidade e à privacidade das outras pessoas.
            </p>
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
