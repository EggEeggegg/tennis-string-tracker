"use client";

interface Props {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "ยืนยัน",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div
        className="bg-[#151c2c] border border-white/10 rounded-[20px] p-6 mx-4 mb-[20vh] max-w-[340px] w-full"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideUp 0.2s ease" }}
      >
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🗑</div>
          <div className="font-bold text-base">{title}</div>
          {description && (
            <div className="text-[#64748b] text-[13px] mt-1">{description}</div>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onCancel}>
            ยกเลิก
          </button>
          <button className="btn-danger flex-1" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
