# Automação de Confirmação e Lembrete de Consulta

## Objetivo
Criar uma régua automática com tom humano para:

- confirmar consulta no dia anterior
- lembrar o paciente no dia da consulta
- abordar com cuidado quando houver ausência ou imprevisto

## Endpoint principal
`GET /api/automation/appointments`

Retorna os leads que estão prontos para receber contato automático.

Exemplo de resposta:

```json
{
  "ok": true,
  "count": 1,
  "due": [
    {
      "leadId": "uuid-do-lead",
      "phone": "5594999999999",
      "full_name": "Maria",
      "appointment_at": "2026-06-03T17:00:00.000Z",
      "appointment_status": "scheduled",
      "phase": "confirmation_request",
      "recommended_message": "Oi, Maria. Passando com carinho para confirmar sua consulta de amanhã...",
      "outbound_payload": {
        "contactId": "uuid-do-lead",
        "destination": "5594999999999",
        "message": "Oi, Maria...",
        "type": "text",
        "source": "agent"
      }
    }
  ]
}
```

## Fases automáticas

### 1. `confirmation_request`
- janela: entre 18h e 30h antes da consulta
- objetivo: confirmar de forma elegante e sem parecer cobrança

### 2. `reminder_day_of`
- janela: entre 1h e 3h antes da consulta
- objetivo: reduzir esquecimento e abrir espaço para aviso de imprevisto

### 3. `missed_followup`
- janela: entre 45min e 6h após o horário da consulta
- objetivo: recuperar o contato com acolhimento e possibilidade de remarcação

## Como o n8n deve usar

### Fluxo recomendado
1. `Schedule Trigger` a cada 15 minutos
2. `HTTP Request` para `GET https://www.institutorafaeldias.site/api/automation/appointments`
3. `Split Out` ou `Loop Over Items` em `due`
4. `HTTP Request` para `POST https://www.institutorafaeldias.site/api/n8n/outbound`
5. `HTTP Request` para `POST https://www.institutorafaeldias.site/api/automation/appointments`

### Envio da mensagem
Use o payload vindo de `outbound_payload`.

### Marcação de envio
Depois do envio com sucesso, chamar:

```json
{
  "leadId": "uuid-do-lead",
  "phase": "confirmation_request",
  "event": "sent"
}
```

## Atualização de status da consulta
O CRM e o n8n podem atualizar o status da consulta via:

`POST /api/automation/appointments`

Exemplos:

### Confirmada
```json
{
  "leadId": "uuid-do-lead",
  "event": "confirmed"
}
```

### Remarcação
```json
{
  "leadId": "uuid-do-lead",
  "event": "rescheduled"
}
```

### Falta
```json
{
  "leadId": "uuid-do-lead",
  "event": "no_show"
}
```

## Regra de ouro do tom de voz
- sempre uma mensagem curta
- nunca parecer sistema
- nunca pressionar o paciente
- sempre abrir espaço para resposta humana
- usar linguagem acolhedora, objetiva e discreta

## Observação importante
Toda mensagem automática deve continuar saindo por:

`POST /api/n8n/outbound`

Assim o handoff humano continua protegido e o histórico segue completo no CRM.
