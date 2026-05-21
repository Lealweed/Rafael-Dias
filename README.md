# CRM Comercial Integrado - n8n & Supabase

Este projeto é um CRM SaaS interno para clínica (Instituto Rafael Dias) operando na integração entre atendimento manual e automações WhatsApp via n8n.

> **Nota sobre Arquitetura (Fase 1)**: Para maximizar compatibilidade com o ambiente de testes (AI Studio, proxy local) a Fase 1 foi desenvolvida com React / Vite e um Backend em Express para a criação de rotas (`/api/*`). Todo o sistema se assemelha e opera sob a mesma prerrogativa de uma aplicação Next.js App Router (Backend para Auth, banco de dados, variáveis não expostas ao client).
>
> Você poderá facilmente fazer o porte destas lógicas para Next.js na Vercel quando necessário, copiando `src` para `app`.

## 🚀 Fases de Entrega
- [x] **Fase 1**: Arquitetura + Schema SQL + Auth/RLS + Healthcheck endpoints.
- [ ] **Fase 2**: CRM + Conversas + Follow-up.
- [ ] **Fase 3**: Pipeline + Relatórios + Integração n8n.
- [ ] **Fase 4**: Hardening (logs, auditoria, LGPD, otimização).

---

## 💻 Setup Local e Desenvolvimento

### 1. Requisitos
- Node.js 18+
- Projeto no Supabase
- Instância n8n (Nuvem ou Local)

### 2. Configuração do Supabase (Banco de Dados)
- Crie um projeto no [Supabase](https://supabase.com).
- No menu **SQL Editor**, abra e execute o script localizado em:
  `supabase/migrations/00001_initial_schema.sql`
- Esse script criará as tabelas essenciais (leads, messages, followups, pipes), policies (RLS), tipos ENUMs e gatilhos de timestamp.
- Vá no menu **Authentication** e crie o seu primeiro usuário.

### 3. Variáveis de Ambiente
Preencha variáveis no Dashboard de onde a aplicação for rodar baseado no template `.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
N8N_WEBHOOK_INBOUND_SECRET="SEGREDO_INBOUND"
```

### 4. Executando Localmente
O sistema é inicializado via:
```bash
npm run dev
```

---

## 🚢 Deploy (Vercel)

Se for hospedar como Vercel, o `server.ts` atual (Express) agirá primariamente em contêineres Docker, enquanto na Vercel as integrações `/api/health` e `/api/n8n/webhook` deverão ser configuradas na pasta `api/` da Vercel ou migradas para Handlers do Next.js. O código TypeScript destas rotas foi estruturado de forma fácil para essa finalidade.

---

## 🔗 Integração n8n (Webhook API)

O endpoint de *Inbound* (receber mensagens ou atualização de leads do n8n) está funcional sob o contrato:
- **POST** `/api/n8n/webhook`
- Requer header: `Authorization: Bearer <SEU_N8N_WEBHOOK_INBOUND_SECRET>`
- *(Recebimento testado. Pipeline de gravação via BD a ser implementado e refinado na Fase 3)*
