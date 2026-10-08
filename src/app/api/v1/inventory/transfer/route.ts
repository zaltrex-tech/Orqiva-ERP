import { NextRequest, NextResponse } from "next/server";
import { StockService } from "@/modules/inventory/stock-service";
import { z } from "zod";

const TransferSchema = z.object({
  tenantId: z.string().default("ORQ-MAIN"),
  actorId: z.string().optional(),
  reference: z.string(),
  sourceLocationId: z.string(),
  destLocationId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().positive(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TransferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tenantId, actorId, reference, sourceLocationId, destLocationId, items } =
      parsed.data;

    const result = await StockService.transferStock({
      tenantId,
      actorId: actorId || "system-actor",
      reference,
      sourceLocationId,
      destLocationId,
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
      message: "Stock transfer verified and committed under row lock.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
