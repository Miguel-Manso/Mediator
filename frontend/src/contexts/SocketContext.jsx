import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext({
  socket: null,
  conectado: false,
  connected: false,
  ultimaReconexao: null,
  inscreverReconexao: () => () => {},
});

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '');

/**
 * Provedor do Contexto de WebSockets (Socket.io) do Mediator.
 * Gerencia ciclo de vida da conexão, autenticação JWT, reconexões automáticas e resiliência.
 */
export const SocketProvider = ({ children }) => {
  const { usuario, user, autenticado, isAuthenticated } = useAuth();
  const usuarioLogado = usuario || user;
  const estaAutenticado = Boolean(autenticado || isAuthenticated || usuarioLogado);

  const [conectado, setConectado] = useState(false);
  const [ultimaReconexao, setUltimaReconexao] = useState(null);

  // Instância do Socket mantida em ref para estabilidade
  const socketRef = useRef(null);
  // Flag para rastrear se houve desconexão prévia (para disparar re-fetch após reconectar)
  const teveQuedaConexaoRef = useRef(false);
  // Lista de callbacks de re-fetch registrados por componentes ativos
  const callbacksReconexaoRef = useRef(new Set());

  // Permite que componentes (Kanban, Modais) registrem funções de re-fetch para quando o socket reconectar
  const inscreverReconexao = useCallback((callback) => {
    if (typeof callback === 'function') {
      callbacksReconexaoRef.current.add(callback);
      return () => {
        callbacksReconexaoRef.current.delete(callback);
      };
    }
    return () => {};
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('@RochaMagazine:token');

    // Se usuário não está autenticado ou não há token, desconecta
    if (!estaAutenticado || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConectado(false);
      return;
    }

    // Inicializa ou reaproveita o socket com o token atualizado
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });
    } else {
      socketRef.current.auth = { token };
      if (!socketRef.current.connected) {
        socketRef.current.connect();
      }
    }

    const s = socketRef.current;

    const onConnect = () => {
      console.log(`[SocketContext] Conectado ao servidor Socket.io (ID: ${s.id})`);
      setConectado(true);

      // Se havia caído antes, aciona a rotina silenciosa de Re-fetch em todos os componentes inscritos
      if (teveQuedaConexaoRef.current) {
        console.log('[SocketContext] Reconexão detectada! Disparando re-fetch silencioso nos componentes ativos...');
        const timestamp = new Date().toISOString();
        setUltimaReconexao(timestamp);
        teveQuedaConexaoRef.current = false;

        callbacksReconexaoRef.current.forEach((cb) => {
          try {
            cb();
          } catch (err) {
            console.error('[SocketContext] Erro ao executar callback de reconexão:', err);
          }
        });
      }
    };

    const onDisconnect = (motivo) => {
      console.warn(`[SocketContext] Desconectado do servidor Socket.io. Motivo: ${motivo}`);
      setConectado(false);
      teveQuedaConexaoRef.current = true;
    };

    const onConnectError = (erro) => {
      console.warn(`[SocketContext] Erro de conexão Socket.io: ${erro.message}`);
      setConectado(false);
      teveQuedaConexaoRef.current = true;
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);

    // Se já estava conectado no momento da criação dos listeners
    if (s.connected) {
      setConectado(true);
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
    };
  }, [estaAutenticado]);

  // Desconecta ao desmontar o Provider
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        conectado,
        connected: conectado,
        ultimaReconexao,
        inscreverReconexao,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Hook customizado para consumir a instância e o status do Socket.io.
 *
 * @returns {{
 *   socket: import('socket.io-client').Socket | null,
 *   conectado: boolean,
 *   connected: boolean,
 *   ultimaReconexao: string | null,
 *   inscreverReconexao: (callback: () => void) => () => void
 * }}
 */
export const useSocket = () => useContext(SocketContext);
export default SocketContext;
