/**
 * Utilitários padronizados e reutilizáveis para suporte à paginação no backend.
 */

/**
 * Extrai e normaliza os parâmetros de paginação de requisições Express.
 * 
 * @param {Object} query - Objeto req.query da requisição
 * @param {number} defaultLimit - Limite padrão se não fornecido (padrão 10)
 * @param {number} maxLimit - Limite máximo aceito por página (padrão 100)
 * @returns {{ pagina: number, limite: number, offset: number }}
 */
function getPaginationParams(query = {}, defaultLimit = 10, maxLimit = 100) {
  const rawPage = query.pagina || query.page || query.p;
  const rawLimit = query.limite || query.limit || query.l;

  let pagina = parseInt(rawPage, 10);
  if (isNaN(pagina) || pagina < 1) {
    pagina = 1;
  }

  let limite = parseInt(rawLimit, 10);
  if (isNaN(limite) || limite < 1) {
    limite = defaultLimit;
  } else if (limite > maxLimit) {
    limite = maxLimit;
  }

  const offset = (pagina - 1) * limite;

  return { pagina, limite, offset };
}

/**
 * Monta o objeto de metadados de paginação.
 * 
 * @param {number} total - Total de registros encontrados no banco
 * @param {number} pagina - Página atual
 * @param {number} limite - Quantidade de registros por página
 * @returns {{ pagina: number, limite: number, total: number, totalPaginas: number }}
 */
function buildPaginationMeta(total = 0, pagina = 1, limite = 10) {
  const totalPaginas = Math.max(1, Math.ceil(total / limite));
  return {
    pagina,
    limite,
    total: Number(total) || 0,
    totalPaginas,
  };
}

module.exports = {
  getPaginationParams,
  buildPaginationMeta,
};
