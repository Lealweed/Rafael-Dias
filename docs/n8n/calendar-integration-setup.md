# Integração Agenda (n8n ↔ Google Calendar)

## 1) Variáveis de ambiente (Vercel)
Configure no projeto da Vercel:

- `N8N_CALENDAR_WEBHOOK_SECRET` = token secreto para chamadas do n8n
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_ID` (use `primary` ou o e-mail/calendário do Dr. Rafael)
- `TZ=America/Fortaleza`

## 2) Endpoint disponível
`POST /api/n8n/calendar`

Autenticação:
- Header `Authorization: Bearer <N8N_CALENDAR_WEBHOOK_SECRET>`

Body base:
```json
{
  "action": "list|create|update|delete"
}
```

### list
```json
{
  "action": "list",
  "timeMin": "2026-06-01T00:00:00-03:00",
  "days": 7
}
```

### create
```json
{
  "action": "create",
  "summary": "Consulta - João",
  "start": "2026-06-01T14:00:00-03:00",
  "end": "2026-06-01T14:30:00-03:00",
  "description": "Primeira avaliação",
  "location": "Clínica",
  "attendees": ["email@exemplo.com"]
}
```

### update
```json
{
  "action": "update",
  "eventId": "abc123",
  "start": "2026-06-01T15:00:00-03:00",
  "end": "2026-06-01T15:30:00-03:00"
}
```

### delete
```json
{
  "action": "delete",
  "eventId": "abc123"
}
```

## 3) Workflow n8n (import)
Arquivo pronto para importar:
- `docs/n8n/workflows/calendar-crud-via-api.json`

Esse workflow:
- recebe `action` por webhook
- normaliza payload
- roteia por ação (create/update/delete/list)
- chama o endpoint `/api/n8n/calendar`
- retorna JSON final ao chamador

## 4) Observações operacionais
- Timezone padrão forçado: `America/Fortaleza`.
- O Google token é renovado automaticamente via `refresh_token`.
- Sem variáveis Google, o endpoint retorna erro claro de configuração.
- Frontend da página de agenda já foi ajustado para ler eventos via backend (`/api/n8n/calendar`), reduzindo dependência de login Google no navegador.
