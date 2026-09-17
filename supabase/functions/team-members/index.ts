import { json, serviceClient, userClient } from "../_shared/db.ts";

type InviteBody = {
  action: "invite";
  name?: unknown;
  email?: unknown;
  role_id?: unknown;
};

type RemoveBody = {
  action: "remove";
  user_id?: unknown;
};

type Body = InviteBody | RemoveBody;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Convites podem criar o usuário antes de o provedor de e-mail responder com
 * erro. Remove somente um usuário recém-criado, ainda sem perfil de negócio.
 */
async function cleanupFailedInvite(email: string): Promise<boolean> {
  const admin = serviceClient();
  const createdAfter = Date.now() - 2 * 60 * 1000;

  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return false;

    const user = (data?.users ?? []).find((candidate) =>
      (candidate.email ?? "").toLowerCase() === email
    );

    if (user) {
      if (new Date(user.created_at).getTime() < createdAfter) return true;

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("tenant_id, is_platform_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || profile?.tenant_id || profile?.is_platform_admin) return false;
      return !(await admin.auth.admin.deleteUser(user.id)).error;
    }

    if ((data?.users ?? []).length < 1000) break;
  }

  return true;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "sessão obrigatória" }, 401);

  const caller = userClient(authHeader);
  const [{ data: auth }, { data: owner, error: ownerError }] = await Promise.all([
    caller.auth.getUser(),
    caller.rpc("current_actor_is_owner"),
  ]);

  if (!auth.user || ownerError || owner !== true) {
    return json({ error: "operação permitida apenas ao dono do negócio" }, 403);
  }

  const { data: actorProfile } = await caller
    .from("profiles")
    .select("tenant_id")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!actorProfile?.tenant_id) return json({ error: "negócio não encontrado" }, 403);

  let body: Body;
  try {
    body = await req.json() as Body;
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }

  const admin = serviceClient();
  const tenantId = actorProfile.tenant_id;

  if (body.action === "invite") {
    const name = text(body.name);
    const email = text(body.email).toLowerCase();
    const roleId = text(body.role_id);

    if (name.length < 2 || name.length > 120) {
      return json({ error: "informe o nome da pessoa" }, 400);
    }
    if (!EMAIL_RE.test(email) || email.length > 320) {
      return json({ error: "informe um e-mail válido" }, 400);
    }

    const { data: role, error: roleError } = await admin
      .from("roles")
      .select("id")
      .eq("id", roleId)
      .eq("tenant_id", tenantId)
      .eq("is_owner", false)
      .maybeSingle();

    if (roleError || !role) return json({ error: "tipo de acesso inválido" }, 400);

    const portalUrl = Deno.env.get("PORTAL_CLIENT_URL")?.replace(/\/$/, "");
    if (!portalUrl) {
      return json({ error: "PORTAL_CLIENT_URL não configurada na Edge Function" }, 500);
    }

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name },
      redirectTo: `${portalUrl}/auth/confirmar`,
    });

    if (inviteError || !invited.user) {
      const exists = inviteError?.status === 422 ||
        /already|registered|exists/i.test(inviteError?.message ?? "");
      if (!exists) await cleanupFailedInvite(email);
      return json(
        { error: exists ? "já existe um usuário com este e-mail" : "não foi possível enviar o convite" },
        exists ? 409 : 502,
      );
    }

    const userId = invited.user.id;
    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      tenant_id: tenantId,
      role_id: roleId,
      full_name: name,
      email,
      is_platform_admin: false,
      status: "active",
    }, { onConflict: "id" });

    if (profileError) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(userId);
      if (cleanupError) {
        console.error(`[team-members] usuário órfão ${userId}: ${cleanupError.message}`);
      }
      return json({ error: "não foi possível concluir o cadastro do funcionário" }, 500);
    }

    return json({ user_id: userId, invited: true });
  }

  if (body.action === "remove") {
    const targetId = text(body.user_id);
    if (!targetId || targetId === auth.user.id) {
      return json({ error: "o dono não pode remover o próprio acesso" }, 400);
    }

    const { data: target, error: targetError } = await admin
      .from("profiles")
      .select("id, roles!inner(is_owner)")
      .eq("id", targetId)
      .eq("tenant_id", tenantId)
      .eq("roles.is_owner", false)
      .maybeSingle();

    if (targetError || !target) return json({ error: "funcionário não encontrado" }, 404);

    const { error: deleteError } = await admin.auth.admin.deleteUser(targetId);
    if (deleteError) {
      // Vendas, caixas e movimentos gravados por essa pessoa podem prender o
      // usuário por chave estrangeira. Nesse caso o caminho certo é suspender,
      // que corta o acesso sem apagar o histórico.
      console.error(`[team-members] remoção de ${targetId} falhou: ${deleteError.message}`);
      return json({
        error: "este funcionário já tem registros no sistema; suspenda o acesso em vez de remover",
      }, 409);
    }

    return json({ removed: true });
  }

  return json({ error: "ação inválida" }, 400);
});
