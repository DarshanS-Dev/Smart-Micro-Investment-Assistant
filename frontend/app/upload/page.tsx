"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GridCanvas } from "@/components/ui/GridCanvas";
import { Button } from "@/components/ui/Button";
import { DropZone } from "@/components/upload/DropZone";
import { UploadErrors } from "@/components/upload/UploadErrors";
import { PreviewTable, type PreviewRow } from "@/components/upload/PreviewTable";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useToast } from "@/components/ui/Toast";
import { uploadCsvWithProgress, ApiError } from "@/lib/api";
import { parseTransactionsCsv, computeRoundupPreview } from "@/lib/csv";
import { ASSET_LABEL, type AssetBucket } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export default function UploadPage() {
  const router = useRouter();
  const { ready, authenticated } = useRequireAuth();
  const { user } = useAuth();
  const { push } = useToast();

  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [navigating, setNavigating] = useState(false);

  async function handleFileSelected(file: File) {
    setClientError(null);
    setRowErrors([]);
    setRows([]);
    setUploadPct(null);

    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setClientError("That doesn't look like a CSV file. Please choose a .csv file.");
      return;
    }
    if (file.size === 0) {
      setClientError("That file is empty.");
      return;
    }

    setFileName(file.name);

    const text = await file.text();
    const { rows: parsedRows, errors } = parseTransactionsCsv(text);

    if (parsedRows.length === 0) {
      setRowErrors(errors.length > 0 ? errors : ["Couldn't find any valid rows in this file."]);
      return;
    }

    setUploading(true);
    try {
      const asset = (user?.asset_bucket ?? "nifty50") as AssetBucket;
      const response = await uploadCsvWithProgress(file, setUploadPct);

      // Backend confirms ingestion; we render the preview from what we
      // parsed client-side, annotated with the same round-up rule the
      // server uses, since the upload response doesn't echo rows back.
      const preview: PreviewRow[] = parsedRows.map((r) => ({
        date: r.date,
        merchant: r.merchant,
        amount: r.amount,
        roundup: computeRoundupPreview(r.amount),
      }));
      setRows(preview);
      setRowErrors(errors);

      if (response?.investments_executed && response.investments_executed.length > 0) {
        response.investments_executed.forEach((inv) => {
          push(
            `Threshold crossed → ${formatINR(inv.amount_invested)} invested in ${ASSET_LABEL[inv.asset] ?? asset}`
          );
        });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && Array.isArray((err.detail as { detail?: unknown })?.detail)) {
        const list = (err.detail as { detail: { row?: number; message?: string }[] }).detail;
        setRowErrors(
          list.map((e) => (e.row ? `Row ${e.row}: ${e.message ?? "invalid row"}` : e.message ?? "Invalid row"))
        );
      } else {
        setClientError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
      }
    } finally {
      setUploading(false);
      setUploadPct(null);
    }
  }

  function handleViewDashboard() {
    setNavigating(true);
    router.push("/dashboard");
  }

  if (!ready || !authenticated) {
    return <GridCanvas />;
  }

  return (
    <GridCanvas>
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-6 py-20 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Step 2 of 2
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
            Bring your spending.
          </h1>
          <p className="mt-3 max-w-lg text-ink/60">
            Upload a CSV of your transactions and we&apos;ll start rounding up
            the spare change into your {user?.asset_bucket ? ASSET_LABEL[user.asset_bucket] : "chosen asset"}.
          </p>
        </motion.div>

        <div className="mt-10">
          <DropZone
            onFileSelected={handleFileSelected}
            disabled={uploading}
            uploadPct={uploadPct}
            clientError={clientError}
            selectedFileName={fileName}
          />
          <UploadErrors errors={rowErrors} />
        </div>

        <PreviewTable rows={rows} />

        <div className="mt-10 flex justify-end">
          <Button onClick={handleViewDashboard} disabled={rows.length === 0} loading={navigating}>
            View Dashboard
          </Button>
        </div>
      </main>
    </GridCanvas>
  );
}
