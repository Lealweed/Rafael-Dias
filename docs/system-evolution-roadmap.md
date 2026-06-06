# Evolução do Sistema Rafael Dias

## Objetivo
Elevar o sistema em 3 frentes ao mesmo tempo:

- atendimento mais humano e mais seguro no WhatsApp
- CRM com histórico confiável para acompanhamento da equipe
- agenda integrada ao Google Calendar com menos risco operacional

## Diagnóstico Atual

### 1. Atendimento / n8n
- O handoff humano já funciona e bloqueia respostas automáticas quando o atendimento humano assume.
- O agente já responde com um tom mais profissional e agora pode usar reações de emoji de forma controlada.
- O fluxo ainda depende bastante de lógica distribuída entre n8n, backend e Supabase.

### 2. CRM
- O CRM já registra inbound e outbound.
- Antes, o histórico perdia contexto de tipo de mensagem.
- Agora o histórico passa a diferenciar melhor texto, sistema, reação, áudio, imagem, documento e vídeo.
- Ainda falta enriquecer ownership, status comercial e próximos passos dentro da conversa.

### 3. Google Agenda
- A integração já cria, edita, exclui e lista eventos.
- O maior risco operacional era conflito de horário.
- Agora o backend bloqueia criação/edição quando encontra sobreposição de evento.
- Ainda falta conectar agenda com jornada comercial e confirmação de presença.

## Melhorias Já Aplicadas

### CRM e atendimento
- Histórico de mensagens com tipo mais fiel no backend.
- Reações do agente também entram no fluxo central e respeitam handoff humano.
- A tela de conversas já passa a exibir melhor tipos de mensagem no histórico.

### Agenda
- Bloqueio de conflito de horário em `create` e `update` no endpoint `/api/n8n/calendar`.
- Resposta de conflito retorna `409 time_conflict` com os eventos conflitantes.

## Próximas Melhorias Prioritárias

### Prioridade 1: Operação da clínica
- adicionar status da conversa no CRM:
  - `novo`
  - `em_atendimento`
  - `aguardando_cliente`
  - `agendado`
  - `em_followup`
  - `encerrado`
- salvar responsável atual pelo atendimento
- salvar data do próximo follow-up
- destacar visualmente no CRM quem está sem resposta há muito tempo

### Prioridade 2: Qualidade do histórico
- guardar origem da mensagem:
  - `agent`
  - `human`
  - `system`
- guardar tipo da mensagem com mais consistência
- criar timeline unificada:
  - mensagem
  - pausa/retomada da automação
  - proposta gerada
  - consulta criada/alterada/cancelada

### Prioridade 3: Agenda comercial e clínica
- vincular evento do Google Calendar ao `lead_id`
- salvar `calendar_event_id` no CRM
- permitir remarcar consulta a partir da conversa
- disparar confirmação automática antes da consulta
- disparar lembrete de no-show / reagendamento

### Prioridade 4: Gestão e métricas
- painel com:
  - tempo médio de primeira resposta
  - tempo até agendamento
  - taxa de handoff humano
  - taxa de comparecimento
  - taxa de conversão por origem
- funil:
  - lead entrou
  - respondeu
  - qualificou
  - agendou
  - compareceu
  - fechou

## Próxima Sprint Recomendada

### Sprint 1
- criar status operacional da conversa no CRM
- salvar responsável pelo atendimento
- vincular `calendar_event_id` ao lead
- criar timeline unificada no CRM

### Sprint 2
- lembrete automático de consulta
- confirmação automática
- no-show e reagendamento
- métricas básicas de atendimento

### Sprint 3
- playbooks de atendimento por tipo de interesse
- follow-up inteligente
- relatórios de conversão por campanha/origem

## Decisão Recomendada
O melhor caminho agora é evoluir o sistema em cima de 2 eixos:

1. `CRM operacional`
2. `Agenda vinculada ao lead`

Esses dois pontos trazem o maior ganho real para a clínica, porque melhoram atendimento, gestão e previsibilidade ao mesmo tempo.
