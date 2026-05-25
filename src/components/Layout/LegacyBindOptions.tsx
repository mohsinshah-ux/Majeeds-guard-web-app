import { useRef, useState } from 'react';
import { createDeviceInvitation, createDeviceMediaInvitation } from '@/lib/api';

export function LegacyBindOptions() {
  const [customLabel, setCustomLabel] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaLink, setMediaLink] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const generateLink = async () => {
    setIsSubmitting(true);
    setActionError('');
    try {
      const invitation = await createDeviceInvitation(customLabel);
      setGeneratedLink(invitation.inviteUrl);
    } catch {
      setActionError('Unable to generate invitation link right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateMediaLink = async () => {
    if (!selectedFile) {
      setActionError('Please select an image or video first.');
      return;
    }
    setIsSubmitting(true);
    setActionError('');
    try {
      const invitation = await createDeviceMediaInvitation(selectedFile.name);
      setMediaLink(invitation.inviteUrl);
    } catch {
      setActionError('Unable to create media invite right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setActionError('Could not copy link automatically. Please copy it manually.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-700 bg-[#0b1022] p-3">
        <h3 className="text-sm font-semibold text-[#e5ffe5] mb-1">Custom Link Generator</h3>
        <p className="text-xs text-slate-400 mb-2">
          Generate a unique bind link for one child device.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Custom label (optional)"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            className="flex-1 min-w-[180px] px-3 py-2 bg-[#020617] border border-slate-600 rounded-lg text-sm text-slate-300 placeholder-slate-500"
          />
          <button
            type="button"
            onClick={generateLink}
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-black text-sm font-medium rounded-lg shadow-[0_0_10px_rgba(34,197,94,0.6)]"
          >
            Generate Link
          </button>
        </div>
        {generatedLink && (
          <div className="mt-2 space-y-2">
            <div className="text-xs text-slate-300 break-all">{generatedLink}</div>
            <button
              type="button"
              onClick={() => copyLink(generatedLink)}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg"
            >
              Copy Link
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-700 bg-[#0b1022] p-3 space-y-2">
        <h3 className="text-sm font-semibold text-[#e5ffe5] mb-1">Select Image / Video</h3>
        <p className="text-xs text-slate-400">
          Select media and generate an invite link you can share with your child.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-[#020617] border border-slate-600 rounded-lg text-sm text-slate-300 cursor-pointer hover:border-[#22c55e]">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <span>Select image / video</span>
          </label>
          {selectedFile && <span className="text-xs text-slate-400">{selectedFile.name}</span>}
          <button
            type="button"
            onClick={generateMediaLink}
            disabled={isSubmitting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium rounded-lg"
          >
            Generate Invite Link
          </button>
        </div>
        {mediaLink && (
          <div className="mt-2 space-y-2">
            <div className="text-xs text-slate-300 break-all">{mediaLink}</div>
            <button
              type="button"
              onClick={() => copyLink(mediaLink)}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg"
            >
              Copy Link
            </button>
          </div>
        )}
      </div>
      {actionError && <p className="text-sm text-red-400">{actionError}</p>}
    </div>
  );
}
