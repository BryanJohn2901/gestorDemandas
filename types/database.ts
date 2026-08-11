export type UserRole = "admin" | "colaborador"
export type UserStatus = "ativo" | "inativo"

export type DemandaStatus =
  | "a_fazer"
  | "em_andamento"
  | "em_revisao"
  | "concluido"

export type DemandaPrioridade = "baixa" | "media" | "alta" | "urgente"

export type Profile = {
  id: string
  nome: string
  email: string
  cargo: string
  role: UserRole
  status: UserStatus
  avatar_url: string | null
  created_at: string
}

export type Demanda = {
  id: string
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
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & Pick<Profile, "id" | "nome" | "email">
        Update: Partial<Profile>
        Relationships: []
      }
      demandas: {
        Row: Demanda
        Insert: Partial<Demanda> & Pick<Demanda, "titulo">
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
