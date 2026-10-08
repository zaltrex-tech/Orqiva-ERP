import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { code: "ORQ-MAIN" },
    });

    if (!tenant) {
      return NextResponse.json({ success: false, error: "Tenant not found" }, { status: 404 });
    }

    // Fetch active POS session
    const session = await prisma.posSession.findFirst({
      where: { tenantId: tenant.id, state: "OPENED" },
      include: { cashier: true },
    });

    // Fetch default stock location
    const defaultStockLoc = await prisma.location.findFirst({
      where: { tenantId: tenant.id, type: "INTERNAL" },
    });

    // Fetch default customer location
    const defaultCustLoc = await prisma.location.findFirst({
      where: { tenantId: tenant.id, type: "CUSTOMER" },
    });

    // Fetch products with their stock quants in the branch
    const products = await prisma.product.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: {
        category: true,
        quants: {
          where: { locationId: defaultStockLoc?.id },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        session: session
          ? {
              id: session.id,
              sessionNumber: session.sessionNumber,
              cashierName: session.cashier.fullName,
              openingBalance: Number(session.openingBalance),
              totalSales: Number(session.totalSales),
            }
          : null,
        locations: {
          stockLocationId: defaultStockLoc?.id || "",
          customerLocationId: defaultCustLoc?.id || "",
        },
        products: products.map((p) => {
          const quant = p.quants[0];
          const onHand = quant ? Number(quant.quantity) - Number(quant.reservedQuantity) : 0;
          return {
            id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category.name,
            price: Number(p.sellingPrice),
            costPrice: Number(p.costPrice),
            taxRate: Number(p.taxRate),
            stockAvailable: onHand,
          };
        }),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
