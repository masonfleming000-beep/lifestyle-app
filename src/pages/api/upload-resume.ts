import type { APIRoute } from "astro";
import { getCurrentUser } from "../../lib/auth";
import { storeUploadedFile } from "../../lib/uploadAssets";

export const prerender = false;

const resumeRule = {
  maxFileSize: 10 * 1024 * 1024,
  allowedExtensions: new Set([".pdf", ".doc", ".docx", ".rtf", ".txt", ".odt"]),
  defaultBaseName: "resume",
  targetDir: "uploads/resumes",
  userScoped: true,
  errorLabel: "file",
} as const;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await getCurrentUser(cookies);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const payload = await storeUploadedFile(file as File, resumeRule, String(user.id || "user"));

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("upload-resume error:", error);

    const message = error instanceof Error ? error.message : "Failed to upload resume.";
    const status = message === "Unauthorized." ? 401 : message.startsWith("Unsupported") || message.startsWith("No file") || message.startsWith("Empty") ? 400 : message.startsWith("File too large") ? 413 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};
