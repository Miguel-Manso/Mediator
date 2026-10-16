require('dotenv').config();

const http = require('http');
const app = require('./app');
const { initDatabase } = require('./config/db');
const { initSocket } = require('./services/socket.service');

const PORT = Number(process.env.PORT) || 3333;

async function iniciarServidor() {
  try {
    // Inicializacao do banco e tabelas no SQL Server
    await initDatabase();

    // Criacao do servidor HTTP nativo acoplado ao Express
    const server = http.createServer(app);

    // Inicializacao do Socket.io para tempo real
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`Servidor Mediator rodando na porta ${PORT} com WebSockets (Socket.io) ativos`);
    });
  } catch (erro) {
    console.error('Erro fatal ao iniciar o servidor:', erro);
  }
}

iniciarServidor();
