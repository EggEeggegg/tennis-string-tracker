import type { Record } from "@/types";
import { fmtDateTime } from "@/lib/utils";

interface Props {
  record: Record;
  onEdit: (r: Record) => void;
  onDelete: (id: string) => void;
}

export function RecordCard({ record: r, onEdit, onDelete }: Props) {
  const edited = r.updated_at !== r.created_at;
  const isOther = r.record_type === "other";

  return (
    <div className="record-item">
      <div className="flex justify-between items-start">
        {/* Left: seq + details */}
        <div className="flex gap-[10px] items-start flex-1 min-w-0">
          {/* Seq badge */}
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center
                       num font-bold text-sm text-white flex-shrink-0"
            style={{
              background: isOther
                ? "linear-gradient(135deg,#06b6d4,#0891b2)"
                : "linear-gradient(135deg,#3b82f6,#2563eb)",
            }}
          >
            {r.seq}
          </div>

          {/* Info */}
          <div className="min-w-0">
            {isOther ? (
              <>
                <div className="flex items-center gap-[6px]">
                  <span className="text-xs">💰</span>
                  <div className="font-bold text-sm truncate">{r.activity_name}</div>
                </div>
                <div
                  className="inline-flex items-center text-[10px] font-semibold px-[6px] py-[2px] rounded-full mt-[3px]"
                  style={{
                    background: "rgba(6,182,212,0.12)",
                    color: "#06b6d4",
                    border: "1px solid rgba(6,182,212,0.25)",
                  }}
                >
                  รายได้อื่นๆ
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-[6px]">
                  <div className="font-bold text-sm truncate">{r.racket}</div>
                </div>
                <div className="text-xs text-[#64748b] mt-[2px]">
                  {r.string1}
                  {r.string2 ? ` / ${r.string2}` : ""}
                </div>
              </>
            )}
            {r.note && (
              <div className="text-[11px] text-[#4b5e7a] mt-[2px]">💬 {r.note}</div>
            )}
            {edited && (
              <span className="badge-edited">✏️ แก้ไข {fmtDateTime(r.updated_at)}</span>
            )}
          </div>
        </div>

        {/* Right: price + actions */}
        <div className="flex flex-col items-end gap-[6px] flex-shrink-0 ml-2">
          <div className="text-right">
            <div
              className="num text-base"
              style={{
                color: isOther
                  ? "#06b6d4"
                  : r.price === 300
                  ? "#f59e0b"
                  : "#22c55e",
              }}
            >
              ฿{r.price}
            </div>
            {!isOther && r.is_new_racket && (
              <div
                className="flex items-center gap-[3px] text-[10px] font-semibold px-[6px] py-[2px] rounded-full"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                🏷️ ขายไม้ +฿200
              </div>
            )}
          </div>
          <div className="flex gap-[6px]">
            <button
              className="btn-ghost px-[10px] py-[6px] text-[11px] rounded-[8px]"
              onClick={() => onEdit(r)}
            >
              ✏️
            </button>
            <button
              className="btn-danger px-[10px] py-[6px] text-[11px] rounded-[8px]"
              onClick={() => onDelete(r.id)}
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
