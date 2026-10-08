import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PurchaseService } from "@/modules/procurement/purchase-service";
import { z } from "zod";

const BillSchema = z.object({
  purchaseOrderId: z.string().min(1),
  billReference: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const tenant = await prisma.tenant.findFirst({ where: { code: "ORQ-MAIN" } });
    if (!tenant) return NextResponse.json({ success: false, error: "Tenant missing" }, { status: 404 });

    const res = await PurchaseService.generateVendorBill({
      tenantId: tenant.id,
      actorId: "system-procurement-mgr",
      ...parsed.data,
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: res.value });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
