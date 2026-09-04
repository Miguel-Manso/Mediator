require('dotenv').config();

const app = require('./app');
const { initDatabase } = require('./config/db');

const PORT = Number(process.env.PORT) || 3333;

async function iniciarServidor() {
  try {
    // Inicializacao do banco e tabelas no SQL Server
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`Servidor Mediator rodando na porta ${PORT}`);
    });
  } catch (erro) {
    console.error('Erro fatal ao iniciar o servidor:', erro);
  }
}

iniciarServidor();
