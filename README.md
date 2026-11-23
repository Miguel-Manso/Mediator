<div align="center">

<img src="frontend/public/logo-full.jpg" alt="Mediator" width="260" />

### Gestão de Ordens de Serviço para assistência técnica

Clientes, equipamentos, triagem, Kanban em tempo real, peças, estoque, relatórios e auditoria num só lugar.

<br />

![React](https://img.shields.io/badge/React_18-2A4B6E?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_5-2A4B6E?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-437194?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-14253D?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-14253D?style=for-the-badge&logo=express&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL_Server-DE6C20?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-DE6C20?style=for-the-badge&logo=socketdotio&logoColor=white)

<sub>Projeto de Estágio Supervisionado II · desenvolvido para a <b>Rocha Magazine</b> (Viradouro/SP)</sub>

</div>

---

## 🧩 Sobre

O **Mediator** é um sistema web de gestão de **Ordens de Serviço (OS)** para assistência técnica. A loja cadastra clientes e equipamentos, abre a OS no balcão com triagem, acompanha o reparo num quadro Kanban atualizado em tempo real, controla peças e estoque e gera relatórios e trilha de auditoria.

## ✨ Funcionalidades

| | Recurso | Descrição |
| :---: | --- | --- |
| 🗂️ | **Quadro Kanban de OS** | Arrastar e soltar entre etapas, atualização em tempo real para todos os usuários (Socket.IO) e colunas personalizáveis: criar, editar, reordenar e inativar com remanejamento das OS. |
| 🔎 | **Lista tabular** | Busca, filtros rápidos e painel de filtros avançados (cliente, técnico, atendente, tipo de serviço, status e período). |
| 📝 | **Abertura com triagem** | Por tipo de reparo (Smartphone/Tablet, Notebook, Desktop, Impressora, Geral), com relato do cliente e observações internas. Numeração automática `OS-AAAAMM-NNNN`. |
| 🛠️ | **Detalhes da OS** | Atribuição de técnico, laudo técnico oficial, apontamentos de bancada e linha do tempo com todas as mudanças de status. |
| 📦 | **Peças e estoque** | Orçamento de peças na OS, baixa no estoque e trava que impede concluir/entregar a OS com peças pendentes de baixa. |
| 💬 | **Conclusão e entrega** | Resumo da OS copiado para a área de transferência e aviso ao cliente pelo WhatsApp com mensagem pronta. |
| 🔒 | **Edição exclusiva** | Só um usuário por vez pode abrir a mesma OS. |
| 👥 | **Cadastros** | Clientes (máscaras de CPF, telefone e CEP), equipamentos (categorias, marcas e modelos), peças com alerta de estoque baixo e usuários. |
| 📊 | **Relatórios** | Agrupados por cliente, técnico ou status, com indicadores e layout de impressão. |
| 🛡️ | **Auditoria** | Registro de todas as operações em OS, com filtros e visualização dos dados enviados. |

## 🔐 Perfis de acesso

| Perfil | Permissões |
| --- | --- |
| ![Administrador](https://img.shields.io/badge/Administrador-14253D?style=flat-square) | Tudo, inclusive gerenciar usuários e consultar a auditoria. Move a OS para qualquer etapa. |
| ![Atendente](https://img.shields.io/badge/Atendente-DE6C20?style=flat-square) | Abre, aprova, entrega e cancela OS; gerencia colunas e cadastros. Etapas: *Aberto*, *Aprovado*, *Entregue* e *Cancelado*. |
| ![Técnico](https://img.shields.io/badge/T%C3%A9cnico-437194?style=flat-square) | Assume OS, faz laudo e apontamentos, lança peças e dá baixa no estoque. Etapas: *Em Análise*, *Aguardando Aprovação*, *Em Reparo*, *Aguardando Peças* e *Testes Finais*. |

## 🎨 Identidade visual

A interface segue o mesmo azul e laranja do logo, definidos em [`tailwind.config.js`](frontend/tailwind.config.js) e [`index.css`](frontend/src/index.css).

| Cor | Hex | Uso |
| :---: | --- | --- |
| ![](https://img.shields.io/badge/%20-%20-2A4B6E?style=for-the-badge) | `#2A4B6E` | **Primária** · Deep Slate Blue: botões principais e foco |
| ![](https://img.shields.io/badge/%20-%20-DE6C20?style=for-the-badge) | `#DE6C20` | **Secundária** · Warm Orange: ações de destaque |
| ![](https://img.shields.io/badge/%20-%20-437194?style=for-the-badge) | `#437194` | **Terciária** · Steel Blue: subtítulos e ícones |
| ![](https://img.shields.io/badge/%20-%20-14253D?style=for-the-badge) | `#14253D` | **Neutra** · Dark Navy Ink: textos |
| ![](https://img.shields.io/badge/%20-%20-0D223A?style=for-the-badge) | `#0D223A` | **Sidebar** · fundos escuros |
| ![](https://img.shields.io/badge/%20-%20-DFE5EB?style=for-the-badge) | `#DFE5EB` | **Canvas** · fundo da aplicação |

**Tipografia:** Plus Jakarta Sans (títulos e interface), Inter (texto) e JetBrains Mono (códigos).

## 🧱 Tecnologias

<table>
<tr>
<td valign="top" width="50%">

**Frontend**
- React 18 + Vite 5
- Tailwind CSS 3
- React Router, Axios, Socket.IO Client
- Framer Motion, Lucide React

</td>
<td valign="top" width="50%">

**Backend**
- Node.js + Express
- Microsoft SQL Server (`mssql`)
- JWT (`jsonwebtoken`) e senhas com `bcryptjs`
- Socket.IO para eventos em tempo real

</td>
</tr>
</table>

## 📁 Estrutura do projeto

```
Mediator/
├── backend/                 # API REST + Socket.IO
│   └── src/
│       ├── config/          # conexão e inicialização do banco
│       ├── controllers/
│       ├── middlewares/     # autenticação, perfis e auditoria
│       ├── models/
│       ├── routes/
│       ├── scripts/         # seed de usuários
│       ├── services/        # socket (tempo real e bloqueio de OS)
│       ├── app.js
│       └── server.js
├── frontend/                # aplicação React (Vite)
│   └── src/
│       ├── components/
│       ├── contexts/
│       ├── layouts/
│       ├── pages/
│       └── services/        # cliente da API e do socket
├── database/
│   └── init_sqlserver.sql   # banco, tabelas e etapas padrão
└── popular_banco/
    └── pop_banc.txt         # dados de teste (opcional)
```

## 🚀 Como rodar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) **18.11+** (o `npm run dev` usa `node --watch`)
- **Microsoft SQL Server** (Express serve) com autenticação SQL habilitada e TCP/IP ativo na porta `1433`

### 1. Banco de dados

No SQL Server Management Studio (ou `sqlcmd`), execute:

1. `database/init_sqlserver.sql` cria o banco `mediator_db`, as tabelas e as etapas padrão do Kanban.
2. *(Opcional)* `popular_banco/pop_banc.txt` insere clientes, produtos, equipamentos e OS de exemplo.

### 2. Backend

```bash
cd backend
npm install
```

Crie o arquivo `backend/.env` com os dados de acesso ao banco:

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

Acesse **http://localhost:5173**.

## 🔑 Contas de teste

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Administrador | `admin@mediator.com` | `admin123` |
| Atendente | `ana@mediator.com` | `123456` |
| Técnico | `carlos@mediator.com` | `123456` |

> [!WARNING]
> Essas contas são recriadas com as senhas padrão sempre que o backend inicia. Antes de usar em produção, desative essa rotina e troque o `JWT_SECRET`.

## 📜 Scripts

| Pasta | Comando | O que faz |
| --- | --- | --- |
| `backend` | `npm run dev` | Inicia a API com recarga automática |
| `backend` | `npm start` | Inicia a API |
| `backend` | `npm run seed` | Recria os usuários de teste |
| `frontend` | `npm run dev` | Inicia o frontend em modo de desenvolvimento |
| `frontend` | `npm run build` | Gera a versão de produção em `dist/` |
| `frontend` | `npm run preview` | Serve a versão de produção localmente |

## 👨‍💻 Autores

<table>
<tr>
<td align="center"><b>Miguel Filipe Manso Pereira</b></td>
<td align="center"><b>Pablo Lemes da Silva</b></td>
</tr>
</table>

<div align="center">
<sub>Estágio Supervisionado II</sub>
<br /><br />
<img src="frontend/public/logo.png" alt="Mediator" width="48" />
</div>
