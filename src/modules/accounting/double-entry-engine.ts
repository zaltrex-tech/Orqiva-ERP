import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { Result, ok, err } from "../core/result";
import { EntryState, AuditAction } from "@prisma/client";

export interface JournalItemInput {
  accountId: string;
  label?: string;
  debit: number;
  credit: number;
}

export interface PostJournalEntryParams {
  tenantId: string;
  actorId: string;
  journalId: string;
  entryNumber: string;
  reference?: string;
  narrative?: string;
  items: JournalItemInput[];
}

export class DoubleEntryEngine {
  /**
   * Validates and posts an atomic double-entry journal record
   * Invariant: Total Debit MUST EXACTLY equal Total Credit
   */
  static async postEntry(params: PostJournalEntryParams): Promise<Result<{ entryId: string }, string>> {
    const { tenantId, actorId, journalId, entryNumber, reference, narrative, items } = params;

    if (!items || items.length < 2) {
      return err("A valid double-entry transaction requires at least two ledger lines.");
    }

    // 1. Math precision invariant check
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of items) {
      if (line.debit < 0 || line.credit < 0) {
        return err("Negative debits or credits are not permitted. Use offsetting entries.");
      }
      if (line.debit > 0 && line.credit > 0) {
        return err("A single line cannot possess both debit and credit amounts simultaneously.");
      }
      totalDebit += Math.round(line.debit * 10000) / 10000;
      totalCredit += Math.round(line.credit * 10000) / 10000;
    }

    const difference = Math.abs(totalDebit - totalCredit);
    if (difference > 0.0001) {
      return err(
        `Accounting Invariant Violation: Debits ($${totalDebit.toFixed(2)}) must equal Credits ($${totalCredit.toFixed(2)}). Delta: $${difference.toFixed(4)}`
      );
    }

    // 2. Atomic transaction write
    try {
      const entry = await prisma.$transaction(async (tx) => {
        const createdEntry = await tx.journalEntry.create({
          data: {
            tenantId,
            journalId,
            entryNumber,
            reference,
            narrative,
            state: EntryState.POSTED,
            postedAt: new Date(),
            items: {
              create: items.map((item) => ({
                tenantId,
                accountId: item.accountId,
                label: item.label,
                debit: item.debit,
                credit: item.credit,
              })),
            },
          },
        });

        return createdEntry;
      });

      // 3. Immutable audit recording
      await recordAuditEvent({
        tenantId,
        actorId,
        action: AuditAction.POST_LEDGER,
        entityType: "JournalEntry",
        entityId: entry.id,
        afterState: {
          entryNumber,
          totalDebit,
          totalCredit,
          itemCount: items.length,
        },
      });

      return ok({ entryId: entry.id });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(`Failed to commit journal entry: ${msg}`);
    }
  }
}
