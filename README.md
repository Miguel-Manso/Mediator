# Mediator

Sistema web de gestão de **Ordens de Serviço (OS)** para assistência técnica, desenvolvido para a Rocha Magazine (Viradouro/SP).

Com ele a loja cadastra clientes e equipamentos, abre a OS no balcão com triagem, acompanha o reparo num quadro Kanban em tempo real, controla peças e estoque e gera relatórios e trilha de auditoria.

> Projeto de Estágio Supervisionado II — Miguel Filipe Manso Pereira e Pablo Lemes da Silva.

---

## Funcionalidades

- **Quadro Kanban de OS**: arrastar e soltar entre etapas, atualização em tempo real para todos os usuários (Socket.IO) e colunas/etapas personalizáveis (criar, editar, reordenar, inativar com remanejamento de OS).
- **Lista tabular** com busca, filtros rápidos e painel de filtros avançados (cliente, técnico, atendente, tipo de serviço, status e período).
- **Abertura de OS com triagem** por tipo de reparo (Smartphone/Tablet, Notebook, Desktop, Impressora, Geral), relato do cliente e observações internas. Numeração automática no formato `OS-AAAAMM-NNNN`.
- **Detalhes da OS**: atribuição de técnico, laudo técnico oficial, apontamentos de bancada e linha do tempo com todas as mudanças de status.
- **Peças e estoque**: orçamento de peças na OS, baixa no estoque e trava que impede concluir/entregar a OS com peças pendentes de baixa.
- **Conclusão e entrega**: resumo da OS copiado para a área de transferência e aviso ao cliente pelo WhatsApp com mensagem pronta.
- **Bloqueio de edição simultânea**: só um usuário por vez pode abrir a mesma OS.
- **Cadastros**: clientes (com máscara de CPF, telefone e CEP), equipamentos (categorias, marcas e modelos), peças/produtos com alerta de estoque baixo e usuários.
- **Relatórios** agrupados por cliente, técnico ou status, com indicadores e layout de impressão.
- **Auditoria** de todas as operações em OS, com filtros e visualização dos dados enviados.
- **Controle de acesso por perfil**: Administrador, Atendente e Técnico.

## Perfis de acesso

| Perfil | Pode fazer |
| --- | --- |
| **Administrador** | Tudo, inclusive gerenciar usuários e consultar a auditoria. Move a OS para qualquer etapa. |
| **Atendente** | Abre, aprova, entrega e cancela OS; gerencia colunas e cadastros. Etapas: Aberto, Aprovado, Entregue e Cancelado. |
| **Técnico** | Assume OS, faz laudo e apontamentos, lança peças e dá baixa no estoque. Etapas: Em Análise, Aguardando Aprovação, Em Reparo, Aguardando Peças e Testes Finais. |

## Tecnologias

**Frontend**
- React 18 + Vite 5
- Tailwind CSS 3
- React Router, Axios, Socket.IO Client
- Framer Motion, Lucide React

**Backend**
- Node.js + Express
- Microsoft SQL Server (`mssql`)
- Autenticação JWT (`jsonwebtoken`) e senhas com `bcryptjs`
- Socket.IO para eventos em tempo real

## Estrutura do projeto

```
Mediator/
├── backend/            # API REST + Socket.IO
│   └── src/
│       ├── config/       # conexão e inicialização do banco
│       ├── controllers/
│       ├── middlewares/  # autenticação, perfis e auditoria
│       ├── models/
│       ├── routes/
│       ├── scripts/      # seed de usuários
│       ├── services/     # socket (tempo real e bloqueio de OS)
│       ├── app.js
│       └── server.js
├── frontend/           # aplicação React (Vite)
│   └── src/
│       ├── components/
│       ├── contexts/
│       ├── layouts/
│       ├── pages/
│       └── services/     # cliente da API e do socket
├── database/
│   └── init_sqlserver.sql   # criação do banco, tabelas e etapas padrão
└── popular_banco/
    └── pop_banc.txt         # dados de teste (opcional)
```

## Como rodar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18.11 ou superior (o `npm run dev` usa `node --watch`)
- Microsoft SQL Server (Express serve) com autenticação SQL habilitada e TCP/IP ativo na porta 1433

### 1. Banco de dados

No SQL Server Management Studio (ou `sqlcmd`), execute:

1. `database/init_sqlserver.sql`: cria o banco `mediator_db`, as tabelas e as etapas padrão do Kanban.
2. *(Opcional)* `popular_banco/pop_banc.txt`: insere clientes, produtos, equipamentos e OS de exemplo.

### 2. Backend

```bash
cd backend
npm install
```

Copie o arquivo `.env exemplo` para `.env` e ajuste os dados de acesso ao banco:

```env
PORT=3333
NODE_ENV=development

DB_USER=sa
DB_PASSWORD=sua_senha
DB_SERVER=localhost\SQLEXPRESS
DB_DATABASE=mediator_db
DB_PORT=1433

JWT_SECRET=troque_por_uma_chave_secreta
JWT_EXPIRES_IN=8h
```

Inicie a API:

```bash
npm run dev
```

A API sobe em `http://localhost:3333/api`. Ao iniciar, o backend confere as tabelas e cria as contas de teste.

### 3. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Contas de teste

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Administrador | admin@mediator.com | admin123 |
| Atendente | ana@mediator.com | 123456 |
| Técnico | carlos@mediator.com | 123456 |

> ⚠️ Essas contas são recriadas com as senhas padrão sempre que o backend inicia. Antes de usar em produção, desative essa rotina e troque o `JWT_SECRET`.

## Scripts

| Pasta | Comando | O que faz |
| --- | --- | --- |
| backend | `npm run dev` | Inicia a API com recarga automática |
| backend | `npm start` | Inicia a API |
| backend | `npm run seed` | Recria os usuários de teste |
| frontend | `npm run dev` | Inicia o frontend em modo de desenvolvimento |
| frontend | `npm run build` | Gera a versão de produção em `dist/` |
| frontend | `npm run preview` | Serve a versão de produção localmente |

## Autores

- **Miguel Filipe Manso Pereira**
- **Pablo Lemes da Silva**

Estágio Supervisionado II
