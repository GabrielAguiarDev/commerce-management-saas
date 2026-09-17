# Mapa de funcionalidades pendentes

Revisão integrada em 16/09/2026, cobrindo portal do cliente, portal administrativo,
aplicativo mobile, landing page e migrations. O módulo fiscal/nota fiscal foi
deliberadamente excluído desta análise e das alterações.

## Entregue nesta rodada

| Área | Situação anterior | Resultado |
| --- | --- | --- |
| Permissões do portal | Papel e módulos eram usados principalmente para montar o menu | Rotas, leituras e Server Actions agora cruzam status, tenant, plano e papel; equipe e papéis exigem o dono |
| Permissões do mobile | Um deep link podia montar uma tela fora das permissões do papel | Sessão carrega permissões e o guardião barra venda, produtos, caixa, estoque, custos e relatórios |
| Equipe | Alterações sensíveis dependiam apenas da aplicação | Triggers protegem papel do dono, tenant, status, papel e privilégio de plataforma contra chamadas diretas |
| Venda | Validação parcial e edição em duas transações | Itens são validados no banco; criar, estornar, desfazer estorno e substituir são atômicos e idempotentes |
| Caixa | Dois aparelhos podiam abrir turnos ao mesmo tempo | Índice parcial garante um único caixa aberto por tenant e as telas traduzem o conflito |
| PDV | Estado de edição podia vazar para uma venda futura e o método exibido podia divergir do salvo | A edição é descartada ao sair do PDV e a forma efetiva é a mesma exibida e persistida |
| Preferências sem efeito | Interruptores de comprovante e nome do cliente eram salvos, mas não alteravam o PDV | Controles foram retirados e substituídos por uma explicação honesta |
| Suporte administrativo | Prioridade não era editável e anexos não abriam | Prioridade pode ser alterada e anexos privados usam URL assinada de curta duração |
| Landing page | CTA de reserva podia não sair do lugar; contato e dados legais tinham marcadores; depoimentos eram fictícios | CTA leva a Contato, canais dependem de configuração real, marcadores legais saíram da publicação e depoimentos fictícios não são renderizados |

## Próximas funcionalidades

### Prioridade alta

1. **Aplicar permissão de papel dentro do banco para todos os domínios usados
   diretamente pelo mobile.** As RPCs de venda já fazem essa validação. Produtos,
   estoque, custos, caixa, relatórios e suporte ainda dependem das policies atuais
   de tenant e do bloqueio de interface. A próxima etapa deve adicionar policies
   restritivas por operação, considerando dependências de leitura (por exemplo:
   vender precisa ler produtos; relatório precisa ler vendas e custos).

2. **Convite e remoção de funcionários.** O dono já cria papéis, troca o papel e
   suspende/libera acessos. Criar ou excluir uma pessoa continua dependendo da
   equipe da plataforma porque também exige coordenar `auth.users`, convite por
   e-mail e `profiles`, com compensação caso uma das etapas falhe.

3. **Materialização de custos recorrentes.** Hoje `is_recurring` e o dia do mês
   são gravados e exibidos, mas não existe rotina que gere o lançamento do mês
   seguinte. A implementação precisa de uma série recorrente, chave única por
   competência e executor agendado/idempotente para não duplicar despesas.

### Prioridade média

4. **Sincronizar preferências do mobile com o tenant.** Tema e parte das
   preferências ainda são locais ao aparelho. É preciso definir quais são
   pessoais e quais pertencem ao negócio antes de sincronizar.

5. **Fila offline para escritas no portal web.** A PWA possui cache de assets,
   mas não uma fila transacional para alterações feitas sem conexão. O mobile já
   tem fila específica para vendas; generalizá-la no navegador exige conflitos,
   indicação de pendência e política de repetição por operação.

6. **Cobertura automatizada das migrations e das Server Actions.** TypeScript,
   lint, builds e testes mobile estão cobertos. Falta um Postgres/Supabase local
   no CI para executar migrations e provar RLS, triggers, concorrência de caixa
   e retries das RPCs.

### Dependências externas

7. Configurar `CONTACT_EMAIL`, o WhatsApp real e os dados jurídicos da empresa,
   com revisão legal dos termos.
8. Inserir depoimentos somente depois de receber texto, identificação, imagem e
   autorização dos clientes.

## Controles deliberadamente indisponíveis

- Ações que dependem de uma seleção, de dados carregados ou de uma transição em
  andamento continuam desabilitadas enquanto a pré-condição não existe.
- Anexos antigos que guardaram apenas o nome do arquivo aparecem sem link, pois
  não há caminho de Storage recuperável.
- Exclusões protegidas por vínculo (por exemplo, tipo de acesso em uso) continuam
  bloqueadas e explicam o motivo.
- Nota fiscal não faz parte deste mapa.
