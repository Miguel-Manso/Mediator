import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
// Remove sufixo '/api' para conectar à raiz do servidor HTTP onde o Socket.io roda
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '');

/**
 * Instância cliente do Socket.io configurada com autenticação JWT dinâmica.
 */
export const socket = io(SOCKET_URL, {
  autoConnect: false, // Inicialização sob controle
  auth: (cb) => {
    const token = localStorage.getItem('@RochaMagazine:token');
    cb({ token });
  },
  transports: ['websocket', 'polling'],
});

/**
 * Conecta o socket ao servidor garantindo o token mais recente no handshake.
 */
export function conectarSocket() {
  const token = localStorage.getItem('@RochaMagazine:token');
  if (token) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
  }
}

/**
 * Desconecta o socket (chamado por exemplo durante o logout).
 */
export function desconectarSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}

// Se o usuário já possuir token ao carregar o bundle, conecta de imediato
if (typeof window !== 'undefined' && localStorage.getItem('@RochaMagazine:token')) {
  conectarSocket();
}

export default socket;
