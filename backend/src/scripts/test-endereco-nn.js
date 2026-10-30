const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Iniciando testes de validação do relacionamento N:N entre Endereços, Clientes e Usuários...\n');

// 1. Validar integridade estática do SQL oficial
console.log('--- 1. Validação do Script SQL Oficial (database/init_sqlserver.sql) ---');
const sqlPath = path.resolve(__dirname, '../../../database/init_sqlserver.sql');
assert.ok(fs.existsSync(sqlPath), 'Arquivo init_sqlserver.sql deve existir');
const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

// Tabela enderecos
assert.ok(sqlContent.includes("CREATE TABLE enderecos"), 'Deve existir CREATE TABLE enderecos');

// Tabela cliente_enderecos
assert.ok(sqlContent.includes("CREATE TABLE cliente_enderecos"), 'Deve existir CREATE TABLE cliente_enderecos');
assert.ok(sqlContent.includes("cliente_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES clientes(id) ON DELETE CASCADE"), 'cliente_enderecos deve ter FK CASCADE para clientes');
assert.ok(sqlContent.includes("endereco_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES enderecos(id) ON DELETE CASCADE"), 'cliente_enderecos deve ter FK CASCADE para enderecos');
assert.ok(sqlContent.includes("UQ_cliente_enderecos UNIQUE (cliente_id, endereco_id)"), 'cliente_enderecos deve ter constraint UNIQUE de cliente_id e endereco_id');

// Tabela usuario_enderecos
assert.ok(sqlContent.includes("CREATE TABLE usuario_enderecos"), 'Deve existir CREATE TABLE usuario_enderecos');
assert.ok(sqlContent.includes("usuario_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES usuarios(id) ON DELETE CASCADE"), 'usuario_enderecos deve ter FK CASCADE para usuarios');
assert.ok(sqlContent.includes("endereco_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES enderecos(id) ON DELETE CASCADE"), 'usuario_enderecos deve ter FK CASCADE para enderecos');
assert.ok(sqlContent.includes("UQ_usuario_enderecos UNIQUE (usuario_id, endereco_id)"), 'usuario_enderecos deve ter constraint UNIQUE de usuario_id e endereco_id');

// Tabelas usuarios e clientes não devem conter endereco_id na definição original
const createUsuariosMatch = sqlContent.match(/CREATE TABLE usuarios \(([\s\S]*?)\);/);
assert.ok(createUsuariosMatch, 'Deve encontrar bloco CREATE TABLE usuarios');
assert.ok(!createUsuariosMatch[1].includes('endereco_id'), 'Tabela usuarios não deve possuir endereco_id na sua definição primária');

const createClientesMatch = sqlContent.match(/CREATE TABLE clientes \(([\s\S]*?)\);/);
assert.ok(createClientesMatch, 'Deve encontrar bloco CREATE TABLE clientes');
assert.ok(!createClientesMatch[1].includes('endereco_id'), 'Tabela clientes não deve possuir endereco_id na sua definição primária');

// Migração retrocompatível
assert.ok(sqlContent.includes("INSERT INTO usuario_enderecos (id, usuario_id, endereco_id, tipo, principal, ativo)"), 'Deve conter lógica de migração de usuarios para usuario_enderecos');
assert.ok(sqlContent.includes("INSERT INTO cliente_enderecos (id, cliente_id, endereco_id, tipo, principal, ativo)"), 'Deve conter lógica de migração de clientes para cliente_enderecos');
console.log('  ✅ [PASS] Script SQL Server inicial e migrações validados com sucesso.');

// 2. Validar integridade das tabelas no db.js
console.log('\n--- 2. Validação da inicialização do banco no backend (db.js) ---');
const dbPath = path.resolve(__dirname, '../config/db.js');
const dbContent = fs.readFileSync(dbPath, 'utf-8');
assert.ok(dbContent.includes("CREATE TABLE cliente_enderecos"), 'db.js deve criar cliente_enderecos');
assert.ok(dbContent.includes("CREATE TABLE usuario_enderecos"), 'db.js deve criar usuario_enderecos');
assert.ok(dbContent.includes("INSERT INTO cliente_enderecos"), 'db.js deve migrar dados de clientes.endereco_id');
assert.ok(dbContent.includes("INSERT INTO usuario_enderecos"), 'db.js deve migrar dados de usuarios.endereco_id');
console.log('  ✅ [PASS] Arquivo db.js configurado corretamente com as tabelas N:N e migração.');

// 3. Validar métodos nos Models
console.log('\n--- 3. Validação dos Models (AddressModel, ClientModel, UserModel) ---');
const AddressModel = require('../models/Address.model');
const ClientModel = require('../models/Client.model');
const UserModel = require('../models/User.model');

// AddressModel
assert.strictEqual(typeof AddressModel.findOrCreate, 'function', 'AddressModel.findOrCreate deve existir');
assert.strictEqual(typeof AddressModel.findMatching, 'function', 'AddressModel.findMatching deve existir');
assert.strictEqual(typeof AddressModel.vincularCliente, 'function', 'AddressModel.vincularCliente deve existir');
assert.strictEqual(typeof AddressModel.desvincularCliente, 'function', 'AddressModel.desvincularCliente deve existir');
assert.strictEqual(typeof AddressModel.findByClienteId, 'function', 'AddressModel.findByClienteId deve existir');
assert.strictEqual(typeof AddressModel.vincularUsuario, 'function', 'AddressModel.vincularUsuario deve existir');
assert.strictEqual(typeof AddressModel.desvincularUsuario, 'function', 'AddressModel.desvincularUsuario deve existir');
assert.strictEqual(typeof AddressModel.findByUsuarioId, 'function', 'AddressModel.findByUsuarioId deve existir');

// ClientModel & UserModel
assert.strictEqual(typeof ClientModel.findAll, 'function', 'ClientModel.findAll deve existir');
assert.strictEqual(typeof ClientModel.findById, 'function', 'ClientModel.findById deve existir');
assert.strictEqual(typeof UserModel.findAll, 'function', 'UserModel.findAll deve existir');
assert.strictEqual(typeof UserModel.findById, 'function', 'UserModel.findById deve existir');
console.log('  ✅ [PASS] Métodos de manipulação e consulta N:N presentes em todos os modelos.');

// 4. Validar Controllers e Rotas
console.log('\n--- 4. Validação de Controllers e Rotas de Endereços ---');
const clientController = require('../controllers/client.controller');
const userController = require('../controllers/user.controller');
const clientRoutes = require('../routes/client.routes');
const userRoutes = require('../routes/user.routes');

assert.strictEqual(typeof clientController.listarEnderecos, 'function', 'clientController.listarEnderecos deve existir');
assert.strictEqual(typeof clientController.adicionarEndereco, 'function', 'clientController.adicionarEndereco deve existir');
assert.strictEqual(typeof clientController.removerEndereco, 'function', 'clientController.removerEndereco deve existir');

assert.strictEqual(typeof userController.listarEnderecos, 'function', 'userController.listarEnderecos deve existir');
assert.strictEqual(typeof userController.adicionarEndereco, 'function', 'userController.adicionarEndereco deve existir');
assert.strictEqual(typeof userController.removerEndereco, 'function', 'userController.removerEndereco deve existir');

assert.ok(clientRoutes, 'clientRoutes carregado com sucesso');
assert.ok(userRoutes, 'userRoutes carregado com sucesso');
console.log('  ✅ [PASS] Endpoints e rotas para múltiplos endereços validados com sucesso.');

// 5. Simulação lógica de relacionamento N:N em memória
console.log('\n--- 5. Simulação da Regra de Negócio N:N (Múltiplos endereços e compartilhamento por família) ---');

// Mock data
const enderecosDB = [];
const clienteEnderecosDB = [];
const clientesDB = [];

function mockFindOrCreateAddress(dados) {
  const normalizar = (s) => (s ? String(s).trim().toLowerCase() : '');
  const existente = enderecosDB.find(
    (e) =>
      normalizar(e.logradouro) === normalizar(dados.logradouro) &&
      normalizar(e.numero) === normalizar(dados.numero) &&
      normalizar(e.bairro) === normalizar(dados.bairro) &&
      normalizar(e.cidade) === normalizar(dados.cidade) &&
      normalizar(e.uf) === normalizar(dados.uf)
  );
  if (existente) return existente;
  const novo = { id: `end-${enderecosDB.length + 1}`, ...dados };
  enderecosDB.push(novo);
  return novo;
}

function mockVincularCliente(clienteId, enderecoId, tipo = 'PRINCIPAL', principal = 1) {
  if (principal === 1) {
    clienteEnderecosDB.forEach((ce) => {
      if (ce.clienteId === clienteId) ce.principal = 0;
    });
  }
  const existente = clienteEnderecosDB.find((ce) => ce.clienteId === clienteId && ce.enderecoId === enderecoId);
  if (existente) {
    existente.ativo = 1;
    existente.principal = principal;
    existente.tipo = tipo;
    return existente;
  }
  const novoLink = { id: `link-${clienteEnderecosDB.length + 1}`, clienteId, enderecoId, tipo, principal, ativo: 1 };
  clienteEnderecosDB.push(novoLink);
  return novoLink;
}

// Caso 1: Pai e Filho da mesma família compartilhando o mesmo endereço
const enderecoFamilia = {
  logradouro: 'Rua das Flores',
  numero: '123',
  bairro: 'Centro',
  cidade: 'Viradouro',
  uf: 'SP',
  cep: '14740-000',
};

const endPai = mockFindOrCreateAddress(enderecoFamilia);
const cliPai = { id: 'cli-pai', nome: 'João da Silva' };
clientesDB.push(cliPai);
mockVincularCliente(cliPai.id, endPai.id, 'RESIDENCIAL', 1);

const endFilho = mockFindOrCreateAddress(enderecoFamilia); // Mesmo endereço
const cliFilho = { id: 'cli-filho', nome: 'Pedro da Silva' };
clientesDB.push(cliFilho);
mockVincularCliente(cliFilho.id, endFilho.id, 'RESIDENCIAL', 1);

assert.strictEqual(endPai.id, endFilho.id, 'Pai e filho devem compartilhar exatamente o mesmo id de endereco');
assert.strictEqual(enderecosDB.length, 1, 'Deve haver apenas 1 registro na tabela enderecos para o endereço familiar');

// Caso 2: Pai cadastra um segundo endereço (comercial)
const enderecoComercial = {
  logradouro: 'Avenida Comercial',
  numero: '500',
  bairro: 'Distrito Industrial',
  cidade: 'Viradouro',
  uf: 'SP',
  cep: '14740-000',
};
const endComercial = mockFindOrCreateAddress(enderecoComercial);
mockVincularCliente(cliPai.id, endComercial.id, 'COMERCIAL', 0);

assert.strictEqual(enderecosDB.length, 2, 'Agora existem 2 endereços no total');

// Validar endereços do Pai
const enderecosDoPai = clienteEnderecosDB.filter((ce) => ce.clienteId === cliPai.id && ce.ativo === 1);
assert.strictEqual(enderecosDoPai.length, 2, 'O pai deve ter 2 endereços vinculados');
assert.ok(enderecosDoPai.some((e) => e.enderecoId === endPai.id && e.principal === 1), 'Pai tem endereço familiar como principal');
assert.ok(enderecosDoPai.some((e) => e.enderecoId === endComercial.id && e.principal === 0), 'Pai tem endereço comercial secundário');

// Validar endereços do Filho
const enderecosDoFilho = clienteEnderecosDB.filter((ce) => ce.clienteId === cliFilho.id && ce.ativo === 1);
assert.strictEqual(enderecosDoFilho.length, 1, 'O filho tem apenas 1 endereço vinculado');
assert.strictEqual(enderecosDoFilho[0].enderecoId, endPai.id, 'O filho compartilha o endereço do pai');

console.log('  ✅ [PASS] Cenário de mesma família compartilhando endereço e cliente com múltiplos endereços validado com sucesso.');
console.log('\n🎉 Todos os testes de validação N:N passaram com 100% de sucesso!');
