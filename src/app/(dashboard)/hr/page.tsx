"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users2, Calculator, CheckCircle2, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface EmployeeRow {
  code: string;
  name: string;
  nameAr?: string;
  department: string;
  departmentAr?: string;
  position: string;
  positionAr?: string;
  salary: number;
  status: "ACTIVE" | "ON_LEAVE";
}

const mockEmployees: EmployeeRow[] = [
  {
    code: "EMP-00101",
    name: "Julian Mercer",
    nameAr: "جوليان ميرسر",
    department: "Supply Chain & Operations",
    departmentAr: "سلاسل الإمداد والعمليات",
    position: "Senior Inventory Controller",
    positionAr: "مراقب مخزون أول",
    salary: 6800.0,
    status: "ACTIVE",
  },
  {
    code: "EMP-00102",
    name: "Elena Rostova",
    nameAr: "إيلينا روستوفا",
    department: "Corporate Finance",
    departmentAr: "المالية المؤسسية",
    position: "Chief Accountant",
    positionAr: "رئيس الحسابات",
    salary: 9500.0,
    status: "ACTIVE",
  },
  {
    code: "EMP-00103",
    name: "Sarah Jenkins",
    nameAr: "سارة جينكينز",
    department: "Commercial Retail",
    departmentAr: "مبيعات التجزئة التجارية",
    position: "Lead Cashier & Terminal Supervisor",
    positionAr: "مشرفة نقاط البيع وكاشير أول",
    salary: 4200.0,
    status: "ACTIVE",
  },
];

export default function HrPage() {
  const { t, locale } = useI18n();
  const [employees] = useState<EmployeeRow[]>(mockEmployees);
  const [payrollRan, setPayrollRan] = useState(false);

  const totalGross = employees.reduce((acc, e) => acc + e.salary, 0);
  const totalTax = totalGross * 0.1;
  const totalNet = totalGross - totalTax;

  const handleRunPayroll = () => {
    setPayrollRan(true);
    setTimeout(() => setPayrollRan(false), 7000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users2 className="w-5 h-5 text-amber-400" />
            {t("hr.title", "Human Resources & Automated Payroll")}
          </h1>
          <p className="text-xs text-slate-400">
            {t("hr.subtitle", "Staff compensation governance, contract compliance, tax withholding and automatic general ledger salary expense posting.")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" className="gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />
            {t("hr.addEmployee", "Add Employee")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunPayroll}
            className="gap-1.5"
          >
            <Calculator className="w-3.5 h-3.5" />
            {t("hr.runPayroll", "Run Monthly Payroll")}
          </Button>
        </div>
      </div>

      {payrollRan && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs text-emerald-200">
            <strong>{t("hr.payrollSuccessTitle", "Monthly Payroll Executed:")}</strong>{" "}
            {locale === "ar"
              ? `تم صرف مبلغ صافي $${totalNet.toFixed(2)} لعدد ${employees.length} موظفين. تم ترحيل قيد مدين إلى 6010 (الرواتب) ودائن إلى 1020 (البنك التجاري).`
              : `Disbursed $${totalNet.toFixed(2)} Net Pay to ${employees.length} employees. Posted Debit to 6010 (Salaries) and Credit to 1020 (Treasury Bank).`}
          </div>
        </div>
      )}

      {/* Payroll Metrics Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/40 border-slate-800 p-4">
          <div className="text-xs text-slate-400 mb-1">{t("hr.grossPayroll", "Total Monthly Gross Payroll")}</div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            ${totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{t("hr.grossSub", "Contract basic wage aggregate")}</div>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 p-4">
          <div className="text-xs text-slate-400 mb-1">{t("hr.taxWithheld", "Tax Withheld (10% Statutory)")}</div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            ${totalTax.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1">{t("hr.taxSub", "Payable to State Revenue Service")}</div>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 p-4">
          <div className="text-xs text-slate-400 mb-1">{t("hr.netCompensation", "Disbursable Net Compensation")}</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            ${totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1">{t("hr.netSub", "Direct wire transfer to employee accounts")}</div>
        </Card>
      </div>

      {/* Employee Table */}
      <Card className="bg-slate-900/40 border-slate-800">
        <CardHeader>
          <div>
            <CardTitle>{t("hr.directoryTitle", "Active Corporate Employee Directory")}</CardTitle>
            <CardDescription>
              {t("hr.directoryDesc", "GDPR-compliant personnel records with role-based access control.")}
            </CardDescription>
          </div>
          <Badge variant="slate" className="font-mono text-[10px]">
            {employees.length} {t("hr.activePersonnel", "ACTIVE PERSONNEL")}
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400">
                <th className="pb-3 font-medium text-start">{t("hr.employeeCode", "Employee Code")}</th>
                <th className="pb-3 font-medium text-start">{t("hr.fullName", "Full Name")}</th>
                <th className="pb-3 font-medium text-start">{t("hr.department", "Department")}</th>
                <th className="pb-3 font-medium text-start">{t("hr.position", "Job Position")}</th>
                <th className="pb-3 font-medium text-end">{t("hr.salary", "Basic Monthly Salary")}</th>
                <th className="pb-3 font-medium text-end">{t("common.status", "Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {employees.map((emp) => (
                <tr key={emp.code} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 font-mono text-amber-400 font-semibold text-start">{emp.code}</td>
                  <td className="py-3.5 font-medium text-slate-100 text-start">{locale === "ar" && emp.nameAr ? emp.nameAr : emp.name}</td>
                  <td className="py-3.5 text-slate-300 text-start">{locale === "ar" && emp.departmentAr ? emp.departmentAr : emp.department}</td>
                  <td className="py-3.5 text-slate-400 text-start">{locale === "ar" && emp.positionAr ? emp.positionAr : emp.position}</td>
                  <td className="py-3.5 text-end font-mono text-slate-200 font-bold">
                    ${emp.salary.toFixed(2)}
                  </td>
                  <td className="py-3.5 text-end">
                    <Badge variant="emerald" className="font-mono text-[10px]">
                      {emp.status === "ACTIVE" ? t("common.active", "ACTIVE") : t("hr.onLeaveStatus", "ON LEAVE")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
