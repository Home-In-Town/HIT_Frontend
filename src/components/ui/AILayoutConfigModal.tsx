'use client';

type Props = {
  open: boolean;
  aiConfig: {
    plots: number;
    spacing: number;
  };
  setAiConfig: (config: any) => void;
  onClose: () => void;
  onGenerate: () => void;
};

export default function AILayoutConfigModal({
  open,
  aiConfig,
  setAiConfig,
  onClose,
  onGenerate,
}: Props) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-[320px] shadow-xl">

        <div className="text-lg font-semibold mb-4">
          AI Layout Generator
        </div>

        <div className="space-y-4">

          {/* Number of Plots */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Plots
            </label>

            <input
              type="number"
              value={aiConfig.plots}
              onChange={(e) =>
                setAiConfig({ ...aiConfig, plots: Number(e.target.value) })
              }
              className="border rounded px-3 py-2 w-full text-sm"
            />
          </div>

          {/* Spacing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spacing Between Plots (cm)
            </label>

            <input
              type="number"
              value={aiConfig.spacing}
              onChange={(e) =>
                setAiConfig({ ...aiConfig, spacing: Number(e.target.value) })
              }
              className="border rounded px-3 py-2 w-full text-sm"
            />
          </div>

        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 border rounded py-2"
          >
            Cancel
          </button>

          <button
            onClick={onGenerate}
            className="flex-1 bg-black text-white rounded py-2"
          >
            Generate
          </button>
        </div>

      </div>
    </div>
  );
}