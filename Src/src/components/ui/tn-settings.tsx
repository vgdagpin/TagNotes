import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, FileText } from "@/components/tn-icons";
import { NotesSettings } from "@shared/models";
import { useTagNotesContext } from "@/contexts/TagNotesContextProvider";

type TnSettingsProps = {
  onClose?: () => void;
  onDirectorySelected?: () => void;
};

const TnSettings = ({ onClose, onDirectorySelected }: TnSettingsProps) => {
  const [settings, setSettings] = useState<NotesSettings | null>(null);

  const tagNotesContext = useTagNotesContext();

  useEffect(() => {
    const tryFetchSelectedDirName = async () => {
      const name = await tagNotesContext.getDirectoryName();
      setSettings({ notesDirectory: name || '' });
    }

    tryFetchSelectedDirName();
  }, [tagNotesContext]);

  // No explicit save: changing directory is immediate.

  const handlePickDirectory = useCallback(async () => {
    try {
      const name = await tagNotesContext.browseDirectory();
      setSettings({ notesDirectory: name });

      onDirectorySelected?.call(null);
    } catch (e) {
      console.error('Failed to switch directory', e);
      alert('Failed to switch directory');
    }
  }, [tagNotesContext, onDirectorySelected]);

  return (
    <div className="h-full flex flex-col min-w-0 w-full">
      {/* Settings Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h2 className="text-xl font-semibold text-foreground">Settings</h2>
          </div>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 p-4 overflow-y-auto space-y-6 min-w-0 w-full">
        {/* Directory Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <h3 className="text-lg font-medium">Notes Storage</h3>
          </div>

          <div className="space-y-2">
            <Label>Current Notes Directory</Label>
            <div className="flex gap-2">
              <Input readOnly value={settings?.notesDirectory || ''} placeholder="Not selected" />
              <Button type="button" variant="outline" onClick={handlePickDirectory}>Change…</Button>
            </div>
            <p className="text-xs text-muted-foreground">Select a directory to store your notes locally. This uses the File System Access API in your browser.</p>
          </div>
        </div>

        <div className="pt-4 text-xs text-muted-foreground space-y-2">
          <p>The browser File System Access API does not expose the full absolute path for privacy. Only the selected folder name is shown.</p>
          <p>If you need to remember the full path, rename the folder in your OS or add it to bookmarks.</p>
        </div>
      </div>
    </div>
  );
};

export default TnSettings;
