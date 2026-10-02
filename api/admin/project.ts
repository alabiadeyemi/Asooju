import {
  applyCors,
  handleOptions,
  sendJson,
} from "../_lib/http";
import { requireAdmin } from "../_lib/admin-auth";

/**
 * GET /api/admin/project?id= — metadata + file paths (no full VFS bodies).
 * DELETE /api/admin/project?id= — delete project row (irreversible). Audited.
 */
export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  try {
    const url = new URL(req.url || "", "http://localhost");
    const id = String(url.searchParams.get("id") || "").trim();
    if (!id) return sendJson(res, 400, { error: "id required" }, req);

    if (req.method === "GET") {
      const { data: project, error } = await ctx.admin
        .from("projects")
        .select(
          "id, user_id, name, prompt, vfs_files, chat_messages, created_at, updated_at"
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!project) return sendJson(res, 404, { error: "Project not found" }, req);

      const vfs =
        project.vfs_files &&
        typeof project.vfs_files === "object" &&
        !Array.isArray(project.vfs_files)
          ? (project.vfs_files as Record<string, string>)
          : {};

      const files = Object.keys(vfs)
        .sort()
        .map((path) => ({
          path,
          bytes: Buffer.byteLength(String(vfs[path] || ""), "utf8"),
        }));

      const chat = Array.isArray(project.chat_messages)
        ? project.chat_messages
        : [];

      const { data: owner } = await ctx.admin
        .from("profiles")
        .select("id, email, plan")
        .eq("id", project.user_id)
        .maybeSingle();

      return sendJson(
        res,
        200,
        {
          project: {
            id: project.id,
            user_id: project.user_id,
            name: project.name,
            prompt: project.prompt
              ? String(project.prompt).slice(0, 2000)
              : null,
            created_at: project.created_at,
            updated_at: project.updated_at,
            fileCount: files.length,
            chatCount: chat.length,
            files,
          },
          owner: owner || null,
        },
        req
      );
    }

    if (req.method === "DELETE") {
      const { data: project, error } = await ctx.admin
        .from("projects")
        .select("id, user_id, name")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!project) return sendJson(res, 404, { error: "Project not found" }, req);

      const { error: delErr } = await ctx.admin
        .from("projects")
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;

      await ctx.admin.from("usage_events").insert({
        user_id: project.user_id,
        kind: "admin_project_delete",
        amount: 1,
        meta: {
          project_id: project.id,
          project_name: project.name,
          admin_email: ctx.user.email || null,
        },
      });

      return sendJson(
        res,
        200,
        { ok: true, deleted: project.id, name: project.name },
        req
      );
    }

    return sendJson(res, 405, { error: "Method not allowed" }, req);
  } catch (e: any) {
    return sendJson(
      res,
      500,
      { error: e?.message || "Project admin failed" },
      req
    );
  }
}
