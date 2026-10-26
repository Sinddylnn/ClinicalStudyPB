import { api } from './cliente';
import type { PerfilUsuario } from './autenticacao';

// <-------------------CONTRATO DE USUÁRIOS------------------->
// Espelha UsuarioResposta, UsuarioCadastroEntrada e UsuarioEdicaoEntrada do backend
// (usuarios/api). Todas as rotas exigem o perfil ADMINISTRADOR.

/** Conta devolvida pela API, sem senha nem hash. */
export type Usuario = {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
};

/** Dados enviados em POST /usuarios. A conta sempre começa ativa. */
export type UsuarioCadastroEntrada = {
  nome: string;
  email: string;
  senha: string;
  perfil: PerfilUsuario;
};

/** Dados enviados em PUT /usuarios/{id}: sem senha e sem situação. */
export type UsuarioEdicaoEntrada = Omit<UsuarioCadastroEntrada, 'senha'>;

export type ServicoUsuarios = {
  listar(): Promise<Usuario[]>;
  cadastrar(entrada: UsuarioCadastroEntrada): Promise<Usuario>;
  editar(id: number, entrada: UsuarioEdicaoEntrada): Promise<Usuario>;
  desativar(id: number): Promise<Usuario>;
  reativar(id: number): Promise<Usuario>;
};

// <-------------------SERVIÇO REAL------------------->
// Lista completa, sem paginação: busca e filtros são feitos na tela
export const servicoUsuarios: ServicoUsuarios = {
  async listar() {
    const { data } = await api.get<Usuario[]>('/usuarios');
    return data;
  },
  async cadastrar(entrada) {
    const { data } = await api.post<Usuario>('/usuarios', entrada);
    return data;
  },
  async editar(id, entrada) {
    const { data } = await api.put<Usuario>(`/usuarios/${id}`, entrada);
    return data;
  },
  async desativar(id) {
    const { data } = await api.patch<Usuario>(`/usuarios/${id}/desativar`);
    return data;
  },
  async reativar(id) {
    const { data } = await api.patch<Usuario>(`/usuarios/${id}/reativar`);
    return data;
  },
};
