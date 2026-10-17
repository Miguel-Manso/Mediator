const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Constantes dos Eventos do Socket
const SOCKET_EVENTS = {
  EMIT_OS_CRIADA: 'os_criada',
  EMIT_OS_STATUS_ATUALIZADO: 'os_status_atualizado',
  EMIT_OS_ATUALIZADA: 'os_atualizada',
  EMIT_OS_NOVO_APONTAMENTO: 'os_novo_apontamento',
  EMIT_OS_ESTOQUE_BAIXADO: 'os_estoque_baixado',
  EMIT_OS_LOCKED: 'os_locked',
  EMIT_OS_LOCK_ACQUIRED: 'os_lock_acquired',
  EMIT_OS_LOCK_RELEASED: 'os_lock_released',
};

// Constantes das Salas (Rooms)
const ROOMS = {
  KANBAN: 'room:kanban',
  OS: (ordemId) => `room:os_${ordemId}`,
};

let io = null;

// Mapa de Bloqueios Pessimistas de Ordem de Serviço em memória:
// key: string (ordemId) -> value: { socketId: string, usuarioId: string, nomeUsuario: string, timestamp: string }
const osLocks = new Map();
// Mapeamento inverso para limpeza instantânea na desconexão:
// key: string (socketId) -> Set<string (ordemId)>
const socketToLocks = new Map();

/**
 * Inicializa a instância do Socket.io atrelada ao servidor HTTP nativo.
 *
 * @param {import('http').Server} httpServer - Servidor HTTP do Node
 * @returns {Server} Instância configurada do socket.io
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Permite conexões de qualquer origem ou configure via env FRONTEND_URL
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Middleware de Autenticação JWT do Socket.io
  io.use((socket, next) => {
    try {
      const secret = process.env.JWT_SECRET || 'rocha_magazine_jwt_secret_dev_key_2026_super_safe';

      // 1. Extrai o token do auth handshake ou dos headers de autorização
      let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

      if (!token) {
        return next(new Error('Autenticação necessária: token JWT não fornecido.'));
      }

      if (token.startsWith('Bearer ')) {
        token = token.slice(7).trim();
      }

      // 2. Verifica a assinatura e expiração do token
      const decodificado = jwt.verify(token, secret);
      socket.usuario = decodificado;
      socket.user = decodificado;

      return next();
    } catch (err) {
      console.warn(`[Socket.io] Falha na autenticação do socket ${socket.id}: ${err.message}`);
      return next(new Error('Sessão expirada ou token de autenticação inválido.'));
    }
  });

  // Gerenciamento de Conexões e Salas (Rooms)
  io.on('connection', (socket) => {
    const nomeUsuario = socket.usuario?.nome || socket.usuario?.name || 'Anônimo';
    const cargoUsuario = socket.usuario?.cargo || socket.usuario?.role || 'N/A';

    console.log(`[Socket.io] Cliente conectado: ${socket.id} (${nomeUsuario} - ${cargoUsuario})`);

    // Por padrão, todo cliente autenticado entra na sala geral do Kanban
    socket.join(ROOMS.KANBAN);

    // Entrada explícita na sala do Kanban
    socket.on('join_kanban', () => {
      socket.join(ROOMS.KANBAN);
      console.log(`[Socket.io] Socket ${socket.id} entrou na sala ${ROOMS.KANBAN}`);
    });

    // Saída da sala do Kanban
    socket.on('leave_kanban', () => {
      socket.leave(ROOMS.KANBAN);
      console.log(`[Socket.io] Socket ${socket.id} saiu da sala ${ROOMS.KANBAN}`);
    });

    // Entrada na sala específica de uma OS com Lock Pessimista de concorrência
    socket.on('join_os', (ordemId, callback) => {
      if (!ordemId) return;
      const ordemIdStr = String(ordemId);
      const currentUserId = socket.usuario?.id || socket.usuario?.sub || socket.usuario?.userId;
      const currentUserName = socket.usuario?.nome || socket.usuario?.name || 'Outro usuário';

      const existingLock = osLocks.get(ordemIdStr);

      // Se já houver um lock ativo por outro usuário e outro socket
      if (existingLock && existingLock.socketId !== socket.id && existingLock.usuarioId !== currentUserId) {
        console.warn(`[Socket.io Lock] OS ${ordemIdStr} já bloqueada por ${existingLock.nomeUsuario}. Acesso negado para ${currentUserName}`);
        
        socket.emit(SOCKET_EVENTS.EMIT_OS_LOCKED, {
          ordemId: ordemIdStr,
          bloqueadoPor: existingLock.nomeUsuario,
          bloqueadoEm: existingLock.timestamp,
        });

        if (typeof callback === 'function') {
          callback({
            sucesso: false,
            bloqueado: true,
            bloqueadoPor: existingLock.nomeUsuario,
            bloqueadoEm: existingLock.timestamp,
          });
        }
        return;
      }

      // Concede o Lock para este usuário / socket
      osLocks.set(ordemIdStr, {
        socketId: socket.id,
        usuarioId: currentUserId,
        nomeUsuario: currentUserName,
        timestamp: new Date().toISOString(),
      });

      if (!socketToLocks.has(socket.id)) {
        socketToLocks.set(socket.id, new Set());
      }
      socketToLocks.get(socket.id).add(ordemIdStr);

      const salaOS = ROOMS.OS(ordemIdStr);
      socket.join(salaOS);
      console.log(`[Socket.io Lock] Lock concedido na OS ${ordemIdStr} para ${currentUserName} (${socket.id})`);

      socket.emit(SOCKET_EVENTS.EMIT_OS_LOCK_ACQUIRED, {
        ordemId: ordemIdStr,
        usuarioId: currentUserId,
        nomeUsuario: currentUserName,
      });

      if (typeof callback === 'function') {
        callback({
          sucesso: true,
          bloqueado: false,
        });
      }
    });

    // Saída da sala da OS (ao fechar o modal) com liberação do Lock
    socket.on('leave_os', (ordemId, callback) => {
      if (!ordemId) return;
      const ordemIdStr = String(ordemId);
      const salaOS = ROOMS.OS(ordemIdStr);
      socket.leave(salaOS);

      const lock = osLocks.get(ordemIdStr);
      if (lock && lock.socketId === socket.id) {
        osLocks.delete(ordemIdStr);
        if (socketToLocks.has(socket.id)) {
          socketToLocks.get(socket.id).delete(ordemIdStr);
        }
        console.log(`[Socket.io Lock] Lock liberado na OS ${ordemIdStr} por fechamento de modal.`);
        io.emit(SOCKET_EVENTS.EMIT_OS_LOCK_RELEASED, { ordemId: ordemIdStr });
      }

      if (typeof callback === 'function') {
        callback({ sucesso: true });
      }
    });

    socket.on('disconnect', (motivo) => {
      const userLocks = socketToLocks.get(socket.id);
      if (userLocks && userLocks.size > 0) {
        userLocks.forEach((ordemIdStr) => {
          const lock = osLocks.get(ordemIdStr);
          if (lock && lock.socketId === socket.id) {
            osLocks.delete(ordemIdStr);
            console.log(`[Socket.io Lock] Lock liberado na OS ${ordemIdStr} por desconexão do socket.`);
            io.emit(SOCKET_EVENTS.EMIT_OS_LOCK_RELEASED, { ordemId: ordemIdStr });
          }
        });
        socketToLocks.delete(socket.id);
      }
      console.log(`[Socket.io] Cliente desconectado: ${socket.id} (Motivo: ${motivo})`);
    });
  });

  return io;
}

/**
 * Retorna a instância global do Socket.io.
 */
function getIO() {
  return io;
}

/**
 * Emite evento de Nova OS Criada.
 * Atualiza contadores e insere o card na coluna inicial do Kanban.
 *
 * @param {Object} ordem - Dados da ordem de serviço criada
 */
function emitOsCriada(ordem) {
  try {
    if (!io) return;
    const payload = {
      ordem,
      timestamp: new Date().toISOString(),
    };

    // Emite para a sala do Kanban e também como broadcast geral
    io.to(ROOMS.KANBAN).emit(SOCKET_EVENTS.EMIT_OS_CRIADA, payload);
    io.emit(SOCKET_EVENTS.EMIT_OS_CRIADA, payload);
  } catch (err) {
    console.error('[Socket.io] Erro silencioso ao emitir os_criada:', err.message);
  }
}

/**
 * Emite evento de Transição de Status / Movimentação no Kanban.
 * Permite que o frontend anime a transição de um card para outra coluna sem refazer o GET.
 *
 * @param {Object} params
 * @param {string|number} params.ordemId - ID da ordem de serviço
 * @param {number} params.novoStatusId - ID do novo status
 * @param {number} [params.statusAnteriorId] - ID do status anterior
 * @param {number} [params.ordemIndex] - Posição do card dentro da coluna
 * @param {Object} [params.ordem] - Objeto completo da OS atualizada
 */
function emitOsStatusAtualizado({
  ordemId,
  osId,
  novoStatusId,
  statusAnteriorId,
  origemStatusId,
  ordemIndex,
  ordem,
  usuarioId,
}) {
  try {
    if (!io) return;
    const finalOrdemId = ordemId || osId;
    const finalOrigemStatusId = statusAnteriorId || origemStatusId;

    const payload = {
      ordemId: finalOrdemId,
      osId: finalOrdemId,
      novoStatusId: Number(novoStatusId),
      statusAnteriorId: finalOrigemStatusId ? Number(finalOrigemStatusId) : undefined,
      origemStatusId: finalOrigemStatusId ? Number(finalOrigemStatusId) : undefined,
      ordemIndex: ordemIndex !== undefined && ordemIndex !== null ? Number(ordemIndex) : 0,
      ordem,
      usuarioId: usuarioId || null,
      timestamp: new Date().toISOString(),
    };

    // Notifica os usuários visualizando o Kanban e os usuários com o modal desta OS aberto
    io.to(ROOMS.KANBAN).emit(SOCKET_EVENTS.EMIT_OS_STATUS_ATUALIZADO, payload);
    io.to(ROOMS.OS(finalOrdemId)).emit(SOCKET_EVENTS.EMIT_OS_STATUS_ATUALIZADO, payload);
    io.emit(SOCKET_EVENTS.EMIT_OS_STATUS_ATUALIZADO, payload);
  } catch (err) {
    console.error('[Socket.io] Erro silencioso ao emitir os_status_atualizado:', err.message);
  }
}

/**
 * Emite evento genérico de atualização da OS (ex: técnico atribuído, laudo, cliente).
 *
 * @param {Object} params
 * @param {string|number} params.ordemId - ID da ordem de serviço
 * @param {Object} [params.dados] - Dados que foram alterados
 * @param {Object} [params.ordem] - Objeto completo da OS atualizada
 */
function emitOsAtualizada({ ordemId, dados, ordem }) {
  try {
    if (!io) return;
    const payload = {
      ordemId,
      dados,
      ordem,
      timestamp: new Date().toISOString(),
    };

    io.to(ROOMS.OS(ordemId)).emit(SOCKET_EVENTS.EMIT_OS_ATUALIZADA, payload);
    io.to(ROOMS.KANBAN).emit(SOCKET_EVENTS.EMIT_OS_ATUALIZADA, payload);
  } catch (err) {
    console.error('[Socket.io] Erro silencioso ao emitir os_atualizada:', err.message);
  }
}

/**
 * Emite evento de Novo Apontamento Técnico / Evolução Técnica.
 * Transmite o novo registro de parecer para a sala específica daquela OS em tempo real.
 *
 * @param {Object} params
 * @param {string|number} params.ordemId - ID da OS
 * @param {Object} params.apontamento - Objeto do apontamento / historico_ordens
 * @param {Object} [params.ordem] - Objeto atualizado da OS
 */
function emitOsNovoApontamento({ ordemId, apontamento, ordem }) {
  try {
    if (!io) return;
    const payload = {
      ordemId,
      apontamento,
      ordem,
      timestamp: new Date().toISOString(),
    };

    // Envia prioritariamente para quem está com o modal de detalhes daquela OS aberto
    io.to(ROOMS.OS(ordemId)).emit(SOCKET_EVENTS.EMIT_OS_NOVO_APONTAMENTO, payload);
    // Envia também para o Kanban caso exibam contadores ou badges de evolução
    io.to(ROOMS.KANBAN).emit(SOCKET_EVENTS.EMIT_OS_NOVO_APONTAMENTO, payload);
  } catch (err) {
    console.error('[Socket.io] Erro silencioso ao emitir os_novo_apontamento:', err.message);
  }
}

/**
 * Emite evento de Baixa no Estoque das Peças da OS.
 * Notifica que peças foram consumidas e liberam o avanço de etapas.
 *
 * @param {Object} params
 * @param {string|number} params.ordemId - ID da OS
 * @param {Array} [params.itens] - Itens baixados
 * @param {Object} [params.ordem] - Objeto atualizado da OS
 */
function emitOsEstoqueBaixado({ ordemId, itens, ordem }) {
  try {
    if (!io) return;
    const payload = {
      ordemId,
      itens,
      ordem,
      timestamp: new Date().toISOString(),
    };

    io.to(ROOMS.OS(ordemId)).emit(SOCKET_EVENTS.EMIT_OS_ESTOQUE_BAIXADO, payload);
    io.to(ROOMS.KANBAN).emit(SOCKET_EVENTS.EMIT_OS_ESTOQUE_BAIXADO, payload);
  } catch (err) {
    console.error('[Socket.io] Erro silencioso ao emitir os_estoque_baixado:', err.message);
  }
}

function getOsLock(ordemId) {
  return osLocks.get(String(ordemId)) || null;
}

module.exports = {
  SOCKET_EVENTS,
  ROOMS,
  initSocket,
  getIO,
  getOsLock,
  emitOsCriada,
  emitOsStatusAtualizado,
  emitOsAtualizada,
  emitOsNovoApontamento,
  emitOsEstoqueBaixado,
};
