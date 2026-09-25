const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const app = require('./app');
const { initDatabase } = require('./config/db');

const PORT = Number(process.env.PORT) || 3333;

async function iniciarServidor() {
  try {
    // Inicializacao do banco e tabelas no SQL Server
    await initDatabase();

    const server = app.listen(PORT, () => {
      console.log(`Servidor Mediator rodando na porta ${PORT}`);
    });

    server.on('error', (erro) => {
      if (erro.code === 'EADDRINUSE') {
        console.error(`❌ Porta ${PORT} já está em uso por outro processo.`);
      } else {
        console.error('Erro no servidor HTTP:', erro);
      }
    });
  } catch (erro) {
    console.error('Erro fatal ao iniciar o servidor:', erro);
  }
}

iniciarServidor();
