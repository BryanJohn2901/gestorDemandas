export type UserRole = "master" | "admin" | "colaborador"
export type UserStatus = "ativo" | "inativo"
export type EmpresaStatus = "ativo" | "inativo"

export type DemandaStatus =
  | "a_fazer"
  | "em_andamento"
  | "em_revisao"
  | "concluido"

export type DemandaPrioridade = "baixa" | "media" | "alta" | "urgente"

export type Empresa = {
  id: string
  nome: string
  status: EmpresaStatus
  created_at: string
}

export type Profile = {
  id: string
  empresa_id: string | null
  nome: string
  email: string
  cargo: string
  role: UserRole
  status: UserStatus
  avatar_url: string | null
  created_at: string
  last_seen_at: string | null
}

export type EventoUso = {
  id: string
  empresa_id: string
  profile_id: string
  acao: string
  created_at: string
}

export type Demanda = {
  id: string
  empresa_id: string
  titulo: string
  descricao: string | null
  responsavel_id: string | null
  status: DemandaStatus
  prioridade: DemandaPrioridade
  prazo: string | null
  cliente_projeto: string | null
  criado_por: string | null
  created_at: string
  updated_at: string
}

export type DemandaComResponsavel = Demanda & {
  responsavel: Pick<Profile, "id" | "nome" | "avatar_url"> | null
}

export type Comentario = {
  id: string
  demanda_id: string
  autor_id: string
  texto: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      empresas: {
        Row: Empresa
        Insert: Partial<Empresa> & Pick<Empresa, "nome">
        Update: Partial<Empresa>
        Relationships: []
      }
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & Pick<Profile, "id" | "nome" | "email">
        Update: Partial<Profile>
        Relationships: []
      }
      demandas: {
        Row: Demanda
        Insert: Partial<Demanda> & Pick<Demanda, "titulo" | "empresa_id">
        Update: Partial<Demanda>
        Relationships: []
      }
      comentarios: {
        Row: Comentario
        Insert: Partial<Comentario> &
          Pick<Comentario, "demanda_id" | "autor_id" | "texto">
        Update: Partial<Comentario>
        Relationships: []
      }
      eventos_uso: {
        Row: EventoUso
        Insert: Partial<EventoUso> & Pick<EventoUso, "empresa_id" | "profile_id" | "acao">
        Update: Partial<EventoUso>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      touch_last_seen: {
        Args: Record<string, never>
        Returns: void
      }
      log_evento: {
        Args: { p_acao: string }
        Returns: void
      }
    }
  }
}
