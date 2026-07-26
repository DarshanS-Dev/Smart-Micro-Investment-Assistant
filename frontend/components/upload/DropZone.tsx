"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { UploadSimple, FileCsv } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  uploadPct: number | null;
  clientError: string | null;
  selectedFileName: string | null;
}

export function DropZone({
  onFileSelected,
  disabled,
  uploadPct,
  clientError,
  selectedFileName,
}: DropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      onFileSelected(file);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 400);
    },
    [onFileSelected]
  );

  return (
    <div>
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        animate={{
          borderColor: flash ? "#D6FF3D" : dragActive ? "#0B0B0B" : "rgba(11,11,11,0.3)",
          backgroundColor: flash ? "#D6FF3D" : "transparent",
        }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={cn(
          "flex min-h-[280px] w-full flex-col items-center justify-center gap-4 border-2 border-dashed px-6 py-12 text-center transition-opacity",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        {selectedFileName ? (
          <FileCsv size={40} weight="light" strokeWidth={1.5} />
        ) : (
          <motion.div
            animate={dragActive ? { y: -8, opacity: 0.7 } : { y: [0, -4, 0], opacity: 1 }}
            transition={dragActive ? { duration: 0.2, ease: "easeOut" } : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <UploadSimple size={40} weight="light" strokeWidth={1.5} />
          </motion.div>
        )}

        <div>
          <p className="font-display text-xl font-semibold">
            {selectedFileName ? selectedFileName : "Drop your CSV here"}
          </p>
          <p className="mt-1 text-sm text-ink/60">
            {selectedFileName
              ? "Drop a new file to replace it"
              : "or browse your files below"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="text-sm font-semibold underline decoration-ink/40 underline-offset-4 hover:decoration-ink disabled:cursor-not-allowed"
        >
          Browse file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </motion.div>

      {uploadPct !== null && (
        <div className="mt-2 h-1 w-full overflow-hidden bg-ink/10">
          <motion.div
            className="h-full bg-lime-500"
            initial={{ width: 0 }}
            animate={{ width: `${uploadPct}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      )}

      <p className="mt-3 text-xs text-ink/45">
        Expected columns: <code className="font-mono">date, merchant, amount</code>
      </p>

      {clientError && (
        <p role="alert" className="mt-2 text-xs text-negative">
          {clientError}
        </p>
      )}
    </div>
  );
}
