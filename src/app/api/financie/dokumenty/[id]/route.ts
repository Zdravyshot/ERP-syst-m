import { requireFinanceDocumentUser } from "@/lib/finance/documents/authorization";
import { documentErrorResponse } from "@/lib/finance/documents/http";
import { getDocumentService } from "@/lib/finance/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function contentDisposition(fileName: string): string {
  const asciiFallback = fileName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]+/g, "")
    .replace(/["\\]/g, "_");
  return `attachment; filename="${asciiFallback || "dokument.pdf"}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireFinanceDocumentUser("VIEW");
    const { id } = await context.params;
    const download = await getDocumentService().getAuthorizedDownload(id, user.id);

    return new Response(download.body, {
      status: 200,
      headers: {
        "Content-Type": download.contentType,
        "Content-Length": String(download.contentLength),
        "Content-Disposition": contentDisposition(download.fileName),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return documentErrorResponse(error);
  }
}
