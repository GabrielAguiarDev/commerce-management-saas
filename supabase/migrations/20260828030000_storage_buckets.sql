-- =====================================================================
-- STORAGE — a logo do negócio e os anexos do suporte.
--
-- Os dois lugares onde o portal hoje FINGE que guarda arquivo:
--
--   1. Configurações › Dados: o botão "Enviar imagem" só mostra um aviso
--      dizendo que ainda não dá.
--   2. Suporte: pior. O botão "Anexar print" grava a string fixa
--      "print-da-tela.png" — não há seletor de arquivo, não há upload, e o
--      nome não tem relação nenhuma com arquivo nenhum. A conversa mostra um
--      anexo que nunca existiu.
--
-- ┌─ POR QUE DOIS BUCKETS, E NÃO UM ───────────────────────────────────────┐
-- │ Eles têm regras de leitura OPOSTAS.                                    │
-- │                                                                        │
-- │ A logo é pública por natureza: aparece no comprovante, e um dia no     │
-- │ cupom fiscal. Bucket público serve URL direta, sem token que expira.   │
-- │                                                                        │
-- │ O anexo do suporte é um print da tela de alguém — pode ter faturamento,│
-- │ nome de cliente, valor de caixa. Bucket privado, lido só por quem é do │
-- │ tenant e pelo admin da plataforma, que precisa ver para atender.       │
-- │                                                                        │
-- │ Num bucket só, a regra teria de ser a mais frouxa das duas.            │
-- └────────────────────────────────────────────────────────────────────────┘
--
-- A CONVENÇÃO DE CAMINHO, que é o que faz o RLS funcionar:
--
--     <tenant_id>/<arquivo>
--
-- A primeira pasta é sempre o uuid do tenant, e é isso que as policies
-- conferem com `storage.foldername(name))[1]`. Um arquivo salvo fora dessa
-- convenção não é lido por ninguém — de propósito: é melhor um upload que
-- some do que um que vaza para o tenant vizinho.
--
-- IDEMPOTENTE: pode ser reaplicada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Os buckets.
--
-- `file_size_limit` é a primeira defesa e a mais barata: o Storage recusa
-- antes de gravar, sem depender de o navegador ter conferido. `allowed_mime_types`
-- vem junto — um bucket público que aceita text/html é um bucket que serve
-- página, e páginas servidas do seu domínio são um problema de segurança, não
-- de armazenamento.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-logos', 'tenant-logos', true,
  2 * 1024 * 1024,                                   -- 2 MB: é um logotipo.
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments', 'support-attachments', false,
  10 * 1024 * 1024,                                  -- 10 MB: print de celular moderno passa de 5.
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- 2. Policies da logo.
--
-- Leitura por `anon` também: o bucket é público e a URL vai parar num
-- comprovante impresso, que ninguém abre com sessão.
-- ---------------------------------------------------------------------
drop policy if exists "logo publica para leitura"        on storage.objects;
drop policy if exists "tenant envia a propria logo"      on storage.objects;
drop policy if exists "tenant troca a propria logo"      on storage.objects;
drop policy if exists "tenant apaga a propria logo"      on storage.objects;

create policy "logo publica para leitura" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'tenant-logos');

create policy "tenant envia a propria logo" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

-- Trocar a logo é sobrescrever. Sem UPDATE, o segundo envio falharia com
-- "already exists" e a pessoa ficaria presa na primeira imagem que escolheu.
create policy "tenant troca a propria logo" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  )
  with check (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

create policy "tenant apaga a propria logo" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

-- ---------------------------------------------------------------------
-- 3. Policies do anexo de suporte.
--
-- Sem `anon` em lugar nenhum. E o admin da plataforma LÊ, porque atender um
-- chamado sem poder abrir o print que o cliente mandou é não atender.
--
-- Não há DELETE: anexo de chamado é parte da conversa. Apagar o print depois
-- de o suporte responder sobre ele deixa a conversa sem sentido — e uma
-- conversa de suporte é o registro de um problema, não um rascunho.
-- ---------------------------------------------------------------------
drop policy if exists "anexo de suporte: leitura do dono e do admin" on storage.objects;
drop policy if exists "anexo de suporte: envio do proprio tenant"    on storage.objects;

create policy "anexo de suporte: leitura do dono e do admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support-attachments'
    and (
      (storage.foldername(name))[1] = public.current_tenant_id()::text
      or public.is_platform_admin()
    )
  );

create policy "anexo de suporte: envio do proprio tenant" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

-- ---------------------------------------------------------------------
-- 4. Onde a logo fica registrada.
--
-- O CAMINHO, não a URL. Uma URL guarda dentro dela o domínio do projeto
-- Supabase; no dia de uma migração de projeto — ou de um domínio próprio na
-- frente do Storage — todas as linhas gravadas apontariam para o lugar antigo.
-- O caminho é estável, e a URL sai dele com `getPublicUrl()` na hora de
-- desenhar.
-- ---------------------------------------------------------------------
alter table public.tenants
  add column if not exists logo_path text;

comment on column public.tenants.logo_path is
  'Caminho do arquivo no bucket tenant-logos, no formato <tenant_id>/<arquivo>. NULL = usa as iniciais do nome. Guarda o caminho e não a URL de propósito — ver 20260828030000_storage_buckets.sql §4.';

-- ┌─ SEM ESTE GRANT, A COLUNA NASCE MORTA ─────────────────────────────────┐
-- │ `20260817120000_fiscal_cadastro.sql` fez, na linha 74:                 │
-- │                                                                        │
-- │     revoke update on public.tenants from authenticated;                │
-- │     grant  update (name, segment, phone, city) on public.tenants ...   │
-- │                                                                        │
-- │ É lista de PERMITIDAS, por coluna. Uma coluna nova não entra nela       │
-- │ sozinha — e o sintoma seria mudo: o UPDATE não dá erro, afeta ZERO      │
-- │ linhas, e a tela diria "salvo" com a logo voltando ao que era na carga  │
-- │ seguinte. Exatamente o bug que a policy de UPDATE em `tenants` já       │
-- │ custou uma vez.                                                        │
-- │                                                                        │
-- │ O trigger de `20260826000000_tenant_update_policy.sql` é outra coisa, e │
-- │ esse não atrapalha: ele devolve ao valor antigo só `id`, `plan`,        │
-- │ `monthly_fee`, `status` e `created_at` — lista de BLOQUEADAS, e         │
-- │ `logo_path` não está nela.                                             │
-- └────────────────────────────────────────────────────────────────────────┘
grant update (logo_path) on public.tenants to authenticated;
