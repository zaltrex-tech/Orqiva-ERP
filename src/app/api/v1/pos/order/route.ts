import { NextRequest, NextResponse } from "next/server";
import { PosService } from "@/modules/pos/pos-service";
import { z } from "zod";

const PosOrderSchema = z.object({
  tenantId: z.string().default("ORQ-MAIN"),
  cashierId: z.string().default("cashier-user"),
  sessionId: z.string(),
  orderNumber: z.string(),
  stockLocationId: z.string(),
  customerLocationId: z.string(),
  paymentMethod: z.enum(["CASH", "CARD"]),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
      taxAmount: z.number().min(0),
    })
  ).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PosOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await PosService.processOrder(parsed.data);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value,
      message: "POS order completed. Inventory deducted and session updated.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
