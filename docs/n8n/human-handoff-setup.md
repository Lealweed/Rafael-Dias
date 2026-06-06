# Handoff Humano no n8n

## Objetivo
Quando um humano assumir o atendimento, o agente precisa parar de responder automaticamente ate que a automacao seja retomada.

## Estado persistido no CRM
O backend agora persiste o estado da automacao no lead:

- `automation_status`: `active` ou `paused_human`
- `automation_paused_at`
- `automation_resumed_at`
- `automation_paused_by`

Migration:
- `supabase/migrations/00003_add_lead_automation_state.sql`

## Endpoints para o n8n

### 1) Consultar se a automacao pode responder
`GET /api/conversations/automation`

Voce pode consultar por `leadId` ou por `phone`.

Exemplo por telefone:
```http
GET /api/conversations/automation?phone=5584999999999
```

Resposta:
```json
{
  "ok": true,
  "lead": {
    "id": "uuid-do-lead",
    "phone": "5584999999999",
    "full_name": "Joao",
    "automation_status": "paused_human"
  }
}
```

Regra no n8n:
- se `lead.automation_status === "paused_human"`, interrompa o fluxo do agente
- se `lead.automation_status === "active"`, permita seguir

### 2) Pausar a automacao quando o humano assumir
`POST /api/conversations/automation`

Body por telefone:
```json
{
  "phone": "5584999999999",
  "action": "pause"
}
```

Body por lead:
```json
{
  "leadId": "uuid-do-lead",
  "action": "pause"
}
```

### 3) Retomar a automacao
`POST /api/conversations/automation`

```json
{
  "phone": "5584999999999",
  "action": "resume"
}
```

### 4) Envio de mensagem pelo agente
`POST /api/n8n/outbound`

O n8n deve enviar `source: "agent"` quando a mensagem for automatica.

```json
{
  "contactId": "uuid-do-lead",
  "destination": "5584999999999",
  "message": "Mensagem do agente",
  "type": "whatsapp",
  "source": "agent"
}
```

Se o atendimento humano estiver ativo, o endpoint retorna:
```json
{
  "error": "automation_paused_human",
  "details": "Atendimento humano ativo. O agente nao pode enviar novas mensagens."
}
```

Status esperado:
- `409 Conflict`

### 5) Envio de reacao por emoji
`POST /api/n8n/outbound`

Se o agente for reagir com emoji, envie como `type: "reaction"`.

```json
{
  "destination": "5584999999999",
  "type": "reaction",
  "source": "agent",
  "reaction": "🙏",
  "targetKey": {
    "remoteJid": "5584999999999@s.whatsapp.net",
    "fromMe": false,
    "id": "ABC123"
  }
}
```

Regra:
- reacao tambem respeita `paused_human`
- reacao nao deve ser usada como atalho para pular o endpoint `/api/n8n/outbound`
- no fluxo da clinica, use reacao apenas em contextos leves e profissionais

## Onde colocar a checagem no n8n

Workflow de referencia para importar:
- `docs/n8n/workflows/human-handoff-guard.json`

### Fluxo recomendado
1. webhook inbound recebe a mensagem do cliente
2. n8n normaliza o telefone e, se existir, o `leadId`
3. n8n chama `GET /api/conversations/automation`
4. um node `IF` ou `Switch` verifica `automation_status`
5. se `paused_human`, encerra o ramo do agente
6. se `active`, segue para memoria, LLM, classificacao e resposta
7. imediatamente antes de enviar a resposta, chame `/api/n8n/outbound` com `source: "agent"`
8. se `/api/n8n/outbound` devolver `409`, finalize sem reenfileirar resposta

## Quando o humano mandar mensagem fora da UI
Se o humano responder por outro canal ou outro fluxo no n8n, esse fluxo tambem precisa pausar a automacao:

1. antes ou junto do envio manual, chame `POST /api/conversations/automation` com `action: "pause"`
2. envie a mensagem manual

Alternativa:
- enviar a mensagem manual via `/api/n8n/outbound` com `source: "human"`
- nesse caso o backend ja pausa a automacao automaticamente

## Estrutura minima de nodes no n8n

### Antes do agente responder
- `HTTP Request - Get Automation State`
- `IF - Automation Is Paused?`
- ramo `true`: termina o fluxo
- ramo `false`: segue para o agente

### Na saida do agente
- `HTTP Request - Send Agent Message`
- URL: `/api/n8n/outbound`
- body com `source: "agent"`

## Observacao importante
Se o agente enviar mensagem direto para o provedor WhatsApp sem passar pelo endpoint `/api/n8n/outbound`, ele nao vai respeitar a pausa. O bloqueio esta centralizado nesse endpoint.
