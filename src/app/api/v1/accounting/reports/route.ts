import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FinancialReportsEngine } from "@/modules/accounting/financial-reports";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "trial-balance";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const exportCsv = searchParams.get("export") === "csv";

    const tenant = await prisma.tenant.findFirst({ where: { code: "ORQ-MAIN" } });
    if (!tenant) return NextResponse.json({ success: false, error: "Tenant missing" }, { status: 404 });

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    if (type === "trial-balance") {
      const report = await FinancialReportsEngine.getTrialBalance({
        tenantId: tenant.id,
        startDate,
        endDate,
      });

      if (exportCsv) {
        const csv = FinancialReportsEngine.exportTrialBalanceCSV(report);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="trial-balance-${Date.now()}.csv"`,
          },
        });
      }

      return NextResponse.json({ success: true, data: report });
    }

    if (type === "pnl") {
      const report = await FinancialReportsEngine.getProfitAndLoss({
        tenantId: tenant.id,
        startDate,
        endDate,
      });

      if (exportCsv) {
        const csv = FinancialReportsEngine.exportPnLCSV(report);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="profit-and-loss-${Date.now()}.csv"`,
          },
        });
      }

      return NextResponse.json({ success: true, data: report });
    }

    if (type === "balance-sheet") {
      const report = await FinancialReportsEngine.getBalanceSheet({
        tenantId: tenant.id,
        asOfDate: endDate,
      });

      if (exportCsv) {
        const csv = FinancialReportsEngine.exportBalanceSheetCSV(report);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="balance-sheet-${Date.now()}.csv"`,
          },
        });
      }

      return NextResponse.json({ success: true, data: report });
    }

    return NextResponse.json({ success: false, error: "Invalid report type" }, { status: 400 });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
