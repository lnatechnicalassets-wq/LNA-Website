import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { requireStaff } from "@/server/auth/require-staff";
import { receiptFilename, receiptSchema, renderPaymentReceipt } from "@/server/email/receipt";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff("receipts:download");
    const id = z
      .string()
      .uuid()
      .safeParse((await params).id);
    if (!id.success)
      return NextResponse.json({ message: "Receipt not found." }, { status: 404, headers });
    const { data, error } = await createSupabaseAdminClient()
      .from("payment_receipts")
      .select("snapshot")
      .eq("enrollment_id", id.data)
      .maybeSingle();
    if (error)
      return NextResponse.json({ message: "Receipt unavailable." }, { status: 503, headers });
    const receipt = receiptSchema.safeParse(data?.snapshot);
    if (!receipt.success)
      return NextResponse.json(
        {
          message:
            "No issued receipt exists for this admission. Older records require reconciliation.",
        },
        { status: 404, headers }
      );
    return new Response(new Uint8Array(renderPaymentReceipt(receipt.data)), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${receiptFilename(receipt.data)}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof AppError ? error.message : "Receipt unavailable." },
      { status: error instanceof AppError ? error.statusCode : 503, headers }
    );
  }
}
