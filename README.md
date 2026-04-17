# TOCS — Controle Total

App interno do TOCS pra controle remoto de dinheiro na loja. Next.js 14 (App Router) + Supabase + Tailwind.

## O que tem rodando

- **Safrapay** — upload de foto do cupom, extração via Claude Vision, grava no banco.
- **Calculadora de cédulas** — soma rápida por denominação, sem persistir nada.
- **Caixa** — ciclo abre → lança reforços/retiradas/transferências entre unidades → fecha conferindo foto do Saipos + contagem física. Detecta divergência automaticamente, exige justificativa, admin revisa no histórico.
- **Extras (freelas)** — cadastro de pessoas, valores padrão por dia da semana (ter/qua/qui = R$70, sex/sáb/dom = R$100), lançamento por data, pagamento com método (dinheiro/PIX com justificativa) e qual caixa pagou. **Não mexe no caixa** (por decisão do Diego — caixa só cobre dinheiro entre antes e depois do serviço, gestão durante o serviço é no Saipos).

## O que ainda falta (pra depois)

- **Fase 4 — Motoboys**: fechamento semanal domingo à noite, notificação na segunda de manhã pra pagar a Silvani Express (PIX pra conta já anotada na memória). Precisa alinhamento do Diego sobre como a Silvani entrega o fechamento.
- **Fase 5 — Alertas WhatsApp**: avisar Diego quando houver divergência grande no fechamento de caixa, e confirmar pagamento pela segunda-feira. Precisa credenciais Meta ou Twilio.
- **Calibrar o prompt do Saipos**: o endpoint `/api/extract-saipos` extrai `cash_total` da foto do relatório do Saipos. Eu fiz na base do palpite — quando o Diego mandar uma foto real, eu ajusto o prompt pra pegar os campos certos.

## Como rodar

1. Instalar dependências: `npm install`
2. Configurar `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ANTHROPIC_API_KEY=...
   ```
3. Rodar a migração no Supabase SQL Editor: `supabase/migration_002_controle_total.sql` (é idempotente, pode rodar de novo sem estragar nada).
4. **Promover o Diego a admin** (só roda uma vez, depois do primeiro login dele):
   ```sql
   update public.profiles
   set role = 'admin'
   where user_id = (select id from auth.users where email = 'diegodsbernardi@gmail.com');
   ```
5. `npm run dev` e abre `http://localhost:3000`.

## Arquitetura rápida

- **Multi-unidade**: 2 unidades (delivery + local, mesma cozinha). Troca via cookie `tocs_unit`, selector no header. Usuário escolhe de qual caixa tá operando.
- **Perfis**: `admin` (Diego, vê tudo, revisa divergências) e `funcionario` (lança caixa/extras, só vê o que lançou no dia). Trigger cria perfil `funcionario` automaticamente no primeiro login.
- **Storage**: bucket `saipos` pra fotos do relatório do Saipos no fechamento de caixa.
- **Cash session**: única por `(unit_id, operation_date)`. Estado `aberto` → `fechado` → (se divergente) `divergente_reconhecido` depois que admin revisa.
- **Movimentações**: `reforco` / `retirada` / `transferencia_saida` / `transferencia_entrada`. Transferência entre unidades é atômica via RPC `transfer_between_units` (cria as duas pontas numa transação só).

## Perguntas pro Diego (quando acordar)

1. Os nomes das duas unidades que coloquei no seed (`TOCS Delivery` e `TOCS Local`) estão certos ou você quer ajustar?
2. Foto real do relatório do Saipos pra eu calibrar o que a IA tem que ler?
3. Os valores padrão dos extras que eu coloquei (ter/qua/qui = 70, sex/sáb/dom = 100) batem? Seg/qua-feira fica 0 por padrão — tá certo?
4. Quer que o histórico de caixa filtre por unidade também (hoje mostra todas pro admin)?

## Estrutura

```
app/
  page.tsx              # dashboard (tiles por papel)
  caixa/                # abrir/lançar/fechar + histórico
  calculadora/          # contador de cédulas standalone
  extras/               # freelas — lançamento e pagamento
    pessoas/            # cadastro
  safrapay/             # upload de cupom (existente, só movi pra cá)
  api/extract-saipos/   # IA — extrai total em dinheiro da foto do Saipos
components/
  AppHeader.tsx         # header com back, user, unit switcher, logout
  DenominationGrid.tsx  # contador de cédulas reutilizável
  UnitSwitcher.tsx
lib/
  units.ts              # listUnits, getCurrentUnit (cookie)
  denominations.ts      # denominações e totalização
  format.ts             # brl, parseNumberBR, datas
supabase/
  migration_002_controle_total.sql
```
