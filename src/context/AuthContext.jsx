import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [conta, setConta] = useState(null)
  const [carregando, setCarregando] = useState(true)

  const carregarPerfil = useCallback(async (userId) => {
    if (!userId) {
      setPerfil(null)
      setConta(null)
      return
    }
    const [{ data }, { data: c }] = await Promise.all([
      supabase.from('perfis').select('*').eq('id', userId).maybeSingle(),
      supabase.rpc('minha_conta'),
    ])
    setPerfil(data)
    setConta(c)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await carregarPerfil(data.session?.user?.id)
      setCarregando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao)
      // fora do callback para não travar o cliente do Supabase
      setTimeout(() => carregarPerfil(novaSessao?.user?.id), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [carregarPerfil])

  const entrar = (email, senha) => supabase.auth.signInWithPassword({ email, password: senha })

  const cadastrar = ({ email, senha, nome, telefone, tipo }) =>
    supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome, telefone, tipo },
        emailRedirectTo: `${window.location.origin}/painel`,
      },
    })

  const sair = () => supabase.auth.signOut()

  const valor = {
    session,
    user: session?.user ?? null,
    perfil,
    // papel: pessoal | titular | gerente | piloto
    conta,
    papel: conta?.papel ?? (perfil?.tipo === 'executivo' ? 'titular' : 'pessoal'),
    carregando,
    entrar,
    cadastrar,
    sair,
    recarregarPerfil: () => carregarPerfil(session?.user?.id),
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
