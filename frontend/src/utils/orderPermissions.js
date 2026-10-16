/**
 * Constantes e funções de validação de RBAC para movimentação de Ordens de Serviço (Kanban)
 * Espelha rigorosamente a regra de negócio do backend (order.controller.js)
 *
 * - ADMIN: Pode mover para qualquer status (1 a 9)
 * - TECNICO: Pode mover APENAS para os status IDs [2, 3, 5, 6, 7]
 * - ATENDENTE: Pode mover APENAS para os status IDs [1, 4, 8, 9]
 */

export const STATUS_PERMITIDOS_POR_CARGO = {
  ADMIN: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  TECNICO: [2, 3, 5, 6, 7],
  ATENDENTE: [1, 4, 8, 9],
};

/**
 * Verifica se um usuário com determinado cargo tem permissão para mover uma OS para o status de destino.
 *
 * @param {string} cargo - Cargo do usuário logado ('ADMIN', 'TECNICO', 'ATENDENTE', etc.)
 * @param {number|string} statusId - ID do status/coluna de destino
 * @returns {boolean} - true se o drop for permitido, false se proibido
 */
export const verificarPermissaoDrop = (cargo, statusId) => {
  const cargoNormalizado = String(cargo || '').trim().toUpperCase();
  const idNum = Number(statusId);

  if (isNaN(idNum)) {
    return false;
  }

  // ADMIN tem acesso irrestrito às etapas 1 a 9
  if (cargoNormalizado === 'ADMIN') {
    return idNum >= 1 && idNum <= 9;
  }

  // TÉCNICO pode atuar apenas em status operacionais / técnicos
  if (cargoNormalizado === 'TECNICO' || cargoNormalizado === 'TECHNICIAN') {
    return STATUS_PERMITIDOS_POR_CARGO.TECNICO.includes(idNum);
  }

  // ATENDENTE pode atuar em triagem, orçamentos e encerramentos
  if (cargoNormalizado === 'ATENDENTE' || cargoNormalizado === 'ATTENDANT') {
    return STATUS_PERMITIDOS_POR_CARGO.ATENDENTE.includes(idNum);
  }

  return false;
};
