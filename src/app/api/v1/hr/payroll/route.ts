import { NextRequest, NextResponse } from "next/server";
import { PayrollService } from "@/modules/hr/payroll-service";
import { z } from "zod";

const PayrollRunSchema = z.object({
  tenantId: z.string().default("ORQ-MAIN"),
  actorId: z.string().default("hr-admin"),
  taxRatePercent: z.number().min(0).max(100).default(10.0),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = PayrollRunSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tenantId, actorId, taxRatePercent } = parsed.data;
    const result = await PayrollService.calculateMonthlyPayroll(tenantId, actorId, taxRatePercent);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value,
      message: "Monthly payroll calculated and recorded in audit log.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
