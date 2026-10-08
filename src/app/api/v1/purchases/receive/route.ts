import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PurchaseService } from "@/modules/procurement/purchase-service";
import { z } from "zod";

const ReceiveSchema = z.object({
  purchaseOrderId: z.string().min(1),
  locationId: z.string().min(1),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantityReceived: z.number().positive(),
      unitCost: z.number().positive(),
    })
  ).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ReceiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const tenant = await prisma.tenant.findFirst({ where: { code: "ORQ-MAIN" } });
    if (!tenant) return NextResponse.json({ success: false, error: "Tenant missing" }, { status: 404 });

    const res = await PurchaseService.receiveGoods({
      tenantId: tenant.id,
      actorId: "system-procurement-mgr",
      ...parsed.data,
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: res.value });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
