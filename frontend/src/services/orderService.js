import { api } from './api';

/**
 * Atualiza a etapa/status e a ordenação de uma Ordem de Serviço no Kanban.
 * 
 * @param {string} osId - Identificador único da Ordem de Serviço
 * @param {Object} params - Parâmetros da transição
 * @param {number|string} params.novaEtapaId - Identificador numérico da etapa de destino
 * @param {number} [params.ordemIndex=0] - Posição do card na coluna
 * @param {Object} [params.historico] - Metadados de auditoria e justificativa
 * @param {string} [params.historico.motivo] - Descrição do motivo da transição
 * @param {string} [params.historico.usuarioId] - ID do usuário autenticado que realizou a ação
 * @returns {Promise<Object>} Dados atualizados da Ordem de Serviço retornados pelo backend
 */
export const updateOSStatus = async (
  osId,
  { novaEtapaId, ordemIndex = 0, historico = {} }
) => {
  const payload = {
    novaEtapaId: Number(novaEtapaId),
    statusId: Number(novaEtapaId),
    ordemIndex: Number(ordemIndex) || 0,
    historico: {
      motivo: historico?.motivo || 'Movimentação via esteira Kanban',
      usuarioId: historico?.usuarioId || undefined,
    },
  };

  const response = await api.patch(`/ordens-servico/${osId}/status`, payload);
  return response.data;
};

/**
 * Busca os dados detalhados de uma OS por ID
 */
export const getOSById = async (osId) => {
  const response = await api.get(`/ordens-servico/${osId}`);
  return response.data;
};
