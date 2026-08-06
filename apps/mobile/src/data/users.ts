import type { AuthUserAPI } from '@domain/session/sessionApiTypes';

import { ID_ACARAJE, ID_PETSHOP, ID_SEM_APP } from './tenants';

/**
 * Credenciais de demonstração, no formato cru do Supabase Auth.
 *
 * O protótipo trocava de perfil por um chip flutuante. Aqui o perfil vem do
 * e-mail com que se entra — que é como vai funcionar de verdade. Os três
 * caminhos do design continuam alcançáveis:
 *
 *   maria@petshopamigo.com.br  → Plano Completo (caixa, estoque, relatórios)
 *   rita@acarajedarita.com.br  → Plano Essencial (só custos)
 *   joao@mercadinho.com.br     → plano sem o módulo `app` → tela de bloqueio
 *
 * Qualquer senha com 6+ caracteres é aceita nesta fase.
 */
export interface MockUser {
  password: string;
  user: AuthUserAPI;
}

export const USERS_API: Record<string, MockUser> = {
  'maria@petshopamigo.com.br': {
    password: 'minhasenha',
    user: {
      id: 'usr_maria',
      email: 'maria@petshopamigo.com.br',
      user_metadata: { full_name: 'Maria Aguiar', tenant_id: ID_PETSHOP },
    },
  },
  'rita@acarajedarita.com.br': {
    password: 'minhasenha',
    user: {
      id: 'usr_rita',
      email: 'rita@acarajedarita.com.br',
      user_metadata: { full_name: 'Rita Andrade', tenant_id: ID_ACARAJE },
    },
  },
  'joao@mercadinho.com.br': {
    password: 'minhasenha',
    user: {
      id: 'usr_joao',
      email: 'joao@mercadinho.com.br',
      user_metadata: { full_name: 'João Bastos', tenant_id: ID_SEM_APP },
    },
  },
};
