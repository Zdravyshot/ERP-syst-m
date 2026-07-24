import { requireFinanceDocumentUser } from "@/lib/finance/documents/authorization";
import { documentErrorResponse } from "@/lib/finance/documents/http";
import { getDocumentService } from "@/lib/finance/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireFinanceDocumentUser();
    const { id } = await context.params;
    const document = await getDocumentService().generateAndStoreInvoicePdf(id);

    return Response.json(
      {
        id: document.id,
        invoiceId: document.invoiceId,
        type: document.type,
        fileName: document.fileName,
        byteSize: document.byteSize,
        sha256: document.sha256,
        downloadUrl: `/api/financie/dokumenty/${document.id}`,
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return documentErrorResponse(error);
  }
}
