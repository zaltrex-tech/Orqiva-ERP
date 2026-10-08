import { NextRequest, NextResponse } from "next/server";
import { DoubleEntryEngine } from "@/modules/accounting/double-entry-engine";
import { z } from "zod";

const PostEntrySchema = z.object({
  tenantId: z.string().default("ORQ-MAIN"),
  actorId: z.string().optional(),
  journalId: z.string(),
  entryNumber: z.string(),
  reference: z.string().optional(),
  narrative: z.string().optional(),
  items: z.array(
    z.object({
      accountId: z.string(),
      label: z.string().optional(),
      debit: z.number().min(0),
      credit: z.number().min(0),
    })
  ).min(2),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PostEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tenantId, actorId, journalId, entryNumber, reference, narrative, items } =
      parsed.data;

    const result = await DoubleEntryEngine.postEntry({
      tenantId,
      actorId: actorId || "finance-actor",
      journalId,
      entryNumber,
      reference,
      narrative,
      items,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value,
      message: "Journal entry posted. Accounting invariant strictly preserved.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
