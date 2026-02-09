import type { CSSProperties } from "react";
import type { HallSideKey } from "../../hooks/useHallConfigs";
import type { HallConfig, HallId, HallSideConfig, HallType } from "../../types";
import { DeferredNumberInput } from "./DeferredNumberInput";

type HallConfigPanelProps = {
  hallId: HallId;
  hall: HallConfig;
  anchorStyle: CSSProperties;
  hallDisplayName: string;
  onHallNameChange: (hallId: HallId, rawName: string) => void;
  onAddSection: (hallId: HallId) => void;
  onRemoveSection: (hallId: HallId, sectionIndex: number) => void;
  onSectionSlicesChange: (hallId: HallId, sectionIndex: number, value: string) => void;
  onSectionSideTypeChange: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    type: HallType,
  ) => void;
  onSectionSideRowsChange: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    value: string,
  ) => void;
  onSectionSideMisCapacityChange: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    value: string,
  ) => void;
  onSectionSideMisRowsChange: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    value: string,
  ) => void;
  onSectionSideMisWidthChange: (
    hallId: HallId,
    sectionIndex: number,
    side: HallSideKey,
    value: string,
  ) => void;
};

export function HallConfigPanel({
  hallId,
  hall,
  anchorStyle,
  hallDisplayName,
  onHallNameChange,
  onAddSection,
  onRemoveSection,
  onSectionSlicesChange,
  onSectionSideTypeChange,
  onSectionSideRowsChange,
  onSectionSideMisCapacityChange,
  onSectionSideMisRowsChange,
  onSectionSideMisWidthChange,
}: HallConfigPanelProps) {
  const renderSideEditor = (
    sectionIndex: number,
    side: HallSideKey,
    label: string,
    sideConfig: HallSideConfig,
  ) => (
    <div className="flex items-center gap-[0.12rem] rounded-[0.35rem] border border-[rgba(124,96,61,0.35)] bg-[rgba(255,255,255,0.85)] px-[0.18rem] py-[0.1rem]">
      <span className="text-[0.58rem] font-bold text-[#5f4c33]">{label}</span>
      <select
        className="rounded-[0.3rem] border border-[rgba(124,96,61,0.45)] bg-white px-[0.14rem] py-[0.06rem] text-[0.58rem] font-semibold text-[#2b251f]"
        value={sideConfig.type}
        onChange={(event) =>
          onSectionSideTypeChange(hallId, sectionIndex, side, event.target.value as HallType)
        }
      >
        <option value="bulk">Bulk</option>
        <option value="chest">Chest</option>
        <option value="mis">MIS</option>
      </select>
      {sideConfig.type === "mis" ? (
        <>
          <span className="text-[0.54rem] font-semibold">C</span>
          <DeferredNumberInput
            className="w-[2.8rem] rounded-sm border border-[rgba(124,96,61,0.45)] bg-white px-[0.1rem] py-[0.05rem] text-[0.56rem]"
            min={1}
            max={200}
            value={sideConfig.misSlotsPerSlice}
            onCommit={(value) => onSectionSideMisCapacityChange(hallId, sectionIndex, side, value)}
          />
          <span className="text-[0.54rem] font-semibold">U</span>
          <DeferredNumberInput
            className="w-[2.2rem] rounded-sm border border-[rgba(124,96,61,0.45)] bg-white px-[0.1rem] py-[0.05rem] text-[0.56rem]"
            min={1}
            max={8}
            value={sideConfig.rowsPerSlice}
            onCommit={(value) => onSectionSideMisRowsChange(hallId, sectionIndex, side, value)}
          />
          <span className="text-[0.54rem] font-semibold">W</span>
          <DeferredNumberInput
            className="w-[2.1rem] rounded-sm border border-[rgba(124,96,61,0.45)] bg-white px-[0.1rem] py-[0.05rem] text-[0.56rem]"
            min={1}
            max={16}
            value={sideConfig.misWidth}
            onCommit={(value) => onSectionSideMisWidthChange(hallId, sectionIndex, side, value)}
          />
        </>
      ) : (
        <>
          <span className="text-[0.54rem] font-semibold">R</span>
          <DeferredNumberInput
            className="w-[2.2rem] rounded-sm border border-[rgba(124,96,61,0.45)] bg-white px-[0.1rem] py-[0.05rem] text-[0.56rem]"
            min={1}
            max={9}
            value={sideConfig.rowsPerSlice}
            onCommit={(value) => onSectionSideRowsChange(hallId, sectionIndex, side, value)}
          />
        </>
      )}
    </div>
  );

  return (
    <div
      className="absolute z-10"
      style={anchorStyle}
      data-no-pan
      data-layout-config
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <div className="grid gap-[0.16rem] rounded-[0.55rem] border border-[rgba(132,100,63,0.4)] bg-[rgba(255,244,223,0.96)] px-[0.32rem] py-[0.2rem] text-[#5f4c33]">
        <div className="flex items-center gap-[0.2rem]">
          <span
            className="cursor-text rounded-[0.2rem] px-[0.08rem] text-[0.62rem] font-bold uppercase tracking-[0.04em] hover:text-[#2d6a4f] focus:bg-white focus:text-[#2d6a4f] focus:outline-none"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            tabIndex={0}
            onBlur={(event) => onHallNameChange(hallId, event.currentTarget.textContent ?? "")}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            title="Click to rename hall"
          >
            {hallDisplayName}
          </span>
          <button
            type="button"
            className="rounded-[0.32rem] border border-[rgba(66,127,90,0.45)] bg-[rgba(233,255,243,0.9)] px-[0.2rem] py-[0.08rem] text-[0.56rem] font-semibold text-[#2f5b43]"
            onClick={() => onAddSection(hallId)}
          >
            + Section
          </button>
        </div>
        {hall.sections.map((section, sectionIndex) => (
          <div key={`${hallId}-section-${sectionIndex}`} className="flex items-center gap-[0.16rem]">
            <span className="text-[0.56rem] font-semibold">#{sectionIndex + 1}</span>
            <span className="text-[0.54rem] font-semibold">S</span>
            <DeferredNumberInput
              className="w-[2.7rem] rounded-sm border border-[rgba(124,96,61,0.45)] bg-white px-[0.1rem] py-[0.05rem] text-[0.56rem]"
              min={1}
              max={200}
              value={section.slices}
              onCommit={(value) => onSectionSlicesChange(hallId, sectionIndex, value)}
            />
            {renderSideEditor(sectionIndex, "left", "L", section.sideLeft)}
            {renderSideEditor(sectionIndex, "right", "R", section.sideRight)}
            {hall.sections.length > 1 ? (
              <button
                type="button"
                className="rounded-[0.28rem] border border-[rgba(153,53,40,0.4)] bg-[rgba(255,237,232,0.95)] px-[0.18rem] py-[0.06rem] text-[0.56rem] font-semibold text-[#7a2318]"
                onClick={() => onRemoveSection(hallId, sectionIndex)}
              >
                x
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
