import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { Result, ok, err } from "../core/result";
import { AuditAction } from "@prisma/client";

export interface PayrollRunResult {
  totalGrossPay: number;
  totalWithholdingTax: number;
  totalNetPay: number;
  processedCount: number;
}

export class PayrollService {
  /**
   * Calculates monthly payroll across active employees
   * Enforces tax withholding rules and generates analytical totals
   */
  static async calculateMonthlyPayroll(
    tenantId: string,
    actorId: string,
    taxRatePercent: number = 10.0
  ): Promise<Result<PayrollRunResult, string>> {
    try {
      const activeEmployees = await prisma.employee.findMany({
        where: { tenantId, isActive: true },
      });

      if (activeEmployees.length === 0) {
        return err("No active employees found to calculate payroll.");
      }

      let totalGross = 0;
      let totalTax = 0;
      let totalNet = 0;

      for (const emp of activeEmployees) {
        const salary = Number(emp.basicSalary);
        const tax = Math.round(salary * (taxRatePercent / 100) * 100) / 100;
        const net = salary - tax;

        totalGross += salary;
        totalTax += tax;
        totalNet += net;
      }

      await recordAuditEvent({
        tenantId,
        actorId,
        action: AuditAction.CREATE,
        entityType: "PayrollRun",
        entityId: `PR-${Date.now()}`,
        afterState: {
          employeeCount: activeEmployees.length,
          totalGross,
          totalTax,
          totalNet,
        },
      });

      return ok({
        totalGrossPay: Math.round(totalGross * 100) / 100,
        totalWithholdingTax: Math.round(totalTax * 100) / 100,
        totalNetPay: Math.round(totalNet * 100) / 100,
        processedCount: activeEmployees.length,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(msg || "Failed to execute payroll calculation.");
    }
  }
}
