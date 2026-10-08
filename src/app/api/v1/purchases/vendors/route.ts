import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PurchaseService } from "@/modules/procurement/purchase-service";
import { z } from "zod";

const VendorSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  taxId: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  paymentTerms: z.string().optional().default("NET30"),
  currency: z.string().optional().default("USD"),
});

export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({ where: { code: "ORQ-MAIN" } });
    if (!tenant) return NextResponse.json({ success: false, error: "Tenant missing" }, { status: 404 });

    const vendors = await prisma.vendor.findMany({
      where: { tenantId: tenant.id },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: { vendors } });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VendorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const tenant = await prisma.tenant.findFirst({ where: { code: "ORQ-MAIN" } });
    if (!tenant) return NextResponse.json({ success: false, error: "Tenant missing" }, { status: 404 });

    const res = await PurchaseService.createVendor({
      tenantId: tenant.id,
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
