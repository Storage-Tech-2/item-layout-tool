import { useState } from "react";
import {
  HALL_LABELS,
  HALL_ORDER,
} from "../constants";
import type { HallConfig, HallId, HallType } from "../types";

type LayoutControlsProps = {
  hallConfigs: Record<HallId, HallConfig>;
  onApplyPreset: (type: HallType) => void;
  onClearLayout: () => void;
  onHallTypeChange: (hallId: HallId, type: HallType) => void;
  onHallSlicesChange: (hallId: HallId, value: string) => void;
  onHallRowsChange: (hallId: HallId, value: string) => void;
  onHallMisCapacityChange: (hallId: HallId, value: string) => void;
};

export function LayoutControls({
  hallConfigs,
  onApplyPreset,
  onClearLayout,
  onHallTypeChange,
  onHallSlicesChange,
  onHallRowsChange,
  onHallMisCapacityChange,
}: LayoutControlsProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const buttonClass =
    "cursor-pointer rounded-[0.55rem] border border-[rgba(61,78,58,0.36)] bg-[#f8fbf7] px-[0.65rem] py-[0.35rem] text-[0.78rem] font-bold text-[#173225] hover:bg-[#e8f5ef]";
  const dangerButtonClass =
    "cursor-pointer rounded-[0.55rem] border border-[rgba(153,53,40,0.42)] bg-[#ffede8] px-[0.65rem] py-[0.35rem] text-[0.78rem] font-bold text-[#752015] hover:bg-[#fdd9d0]";

  return (
    <>
      <div
        className="flex items-start justify-between gap-4 border-b border-b-[rgba(114,88,46,0.24)] bg-gradient-to-b from-[#fff7e8] to-[#fdf0db] px-5 py-4 max-[860px]:flex-col max-[860px]:items-stretch"
        data-no-pan
      >
        <div className="flex flex-col gap-[0.3rem]">
          <h1 className="m-0 text-[1.25rem] leading-[1.2] tracking-[0.02em]">
            Storage Layout Planner
          </h1>
          <p className="m-0 text-[0.85rem] text-[#6d6256]">
            Drag items from the right list into slots on the left blueprint.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-[0.4rem] max-[860px]:justify-start">
          <button
            type="button"
            onClick={() => setIsConfigOpen((current) => !current)}
            className={buttonClass}
          >
            {isConfigOpen ? "Hide Config" : "Show Config"}
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset("chest")}
            className={buttonClass}
          >
            All Chest
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset("bulk")}
            className={buttonClass}
          >
            All Bulk
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset("mis")}
            className={buttonClass}
          >
            All MIS
          </button>
          <button
            type="button"
            onClick={onClearLayout}
            className={dangerButtonClass}
          >
            Clear Layout
          </button>
        </div>
      </div>

      {isConfigOpen ? (
        <div
          className="grid grid-cols-4 gap-[0.55rem] border-b border-b-[rgba(114,88,46,0.2)] bg-[#fef8ed] px-4 py-3 max-[860px]:grid-cols-2"
          data-no-pan
        >
          {HALL_ORDER.map((hallId) => {
            const hall = hallConfigs[hallId];
            return (
              <fieldset
                key={hallId}
                className="m-0 grid gap-2 rounded-[0.7rem] border border-[rgba(142,114,69,0.27)] bg-[#fff6e7] px-[0.55rem] pb-[0.62rem] pt-[0.55rem]"
              >
                <legend className="px-[0.2rem] text-[0.72rem] uppercase tracking-[0.05em] text-[#6d6256]">
                  {HALL_LABELS[hallId]}
                </legend>

                <label className="grid gap-[0.22rem]">
                  <span className="text-[0.7rem] text-[#6d6256]">Type</span>
                  <select
                    className="w-full rounded-[0.45rem] border border-[rgba(133,108,70,0.4)] bg-[#fffdf8] px-[0.36rem] py-[0.3rem] text-[0.8rem] text-[#1f1a16] outline-none"
                    value={hall.type}
                    onChange={(event) =>
                      onHallTypeChange(hallId, event.target.value as HallType)
                    }
                  >
                    <option value="bulk">Bulk</option>
                    <option value="chest">Chest</option>
                    <option value="mis">MIS</option>
                  </select>
                </label>

                <label className="grid gap-[0.22rem]">
                  <span className="text-[0.7rem] text-[#6d6256]">Slices</span>
                  <input
                    className="w-full rounded-[0.45rem] border border-[rgba(133,108,70,0.4)] bg-[#fffdf8] px-[0.36rem] py-[0.3rem] text-[0.8rem] text-[#1f1a16] outline-none"
                    type="number"
                    min={1}
                    max={72}
                    value={hall.slices}
                    onChange={(event) => onHallSlicesChange(hallId, event.target.value)}
                  />
                </label>

                {hall.type === "mis" ? (
                  <label className="grid gap-[0.22rem]">
                    <span className="text-[0.7rem] text-[#6d6256]">Slots / Slice</span>
                    <input
                      className="w-full rounded-[0.45rem] border border-[rgba(133,108,70,0.4)] bg-[#fffdf8] px-[0.36rem] py-[0.3rem] text-[0.8rem] text-[#1f1a16] outline-none"
                      type="number"
                      min={10}
                      max={200}
                      value={hall.misSlotsPerSlice}
                      onChange={(event) =>
                        onHallMisCapacityChange(hallId, event.target.value)
                      }
                    />
                  </label>
                ) : (
                  <label className="grid gap-[0.22rem]">
                    <span className="text-[0.7rem] text-[#6d6256]">Rows / Side</span>
                    <input
                      className="w-full rounded-[0.45rem] border border-[rgba(133,108,70,0.4)] bg-[#fffdf8] px-[0.36rem] py-[0.3rem] text-[0.8rem] text-[#1f1a16] outline-none"
                      type="number"
                      min={1}
                      max={9}
                      value={hall.rowsPerSide}
                      onChange={(event) => onHallRowsChange(hallId, event.target.value)}
                    />
                  </label>
                )}
              </fieldset>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
