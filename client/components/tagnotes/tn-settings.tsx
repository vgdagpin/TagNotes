import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Settings, Save, FileText } from "../tn-icons";
import axios from "axios";
import { NotesSettings } from "@shared/models";

type TnSettingsProps = {
  onClose?: () => void;
};

const TnSettings = ({ onClose }: TnSettingsProps) => {
  const [settings, setSettings] = useState<NotesSettings | null>(null);

  // Load settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      const res = await axios.get('/api/settings');
      const data : NotesSettings = res.data;

      setSettings(data);
    }

    fetchSettings();
  }, []);

  const handleSave = useCallback(async () => {
    if (settings) {
      try {
        await axios.post('/api/settings', settings);
        alert("Settings saved successfully!");
      } catch (error) {
        console.error("Failed to save settings:", error);
        alert("Failed to save settings. Please try again.");
      }
    }
  }, [settings]);

  const handleSetNotesDirectory = (value: string) => {
    if (settings) {
      setSettings((prev) => ({ ...prev, notesDirectory: value }));
    }
  };

  return (
    <TabsContent
      value="settings"
      className="h-full mt-0 data-[state=active]:flex flex-col min-w-0 w-full"
    >
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
            <Label htmlFor="notes-directory">Notes Directory Path</Label>
            <Input
              id="notes-directory"
              value={settings?.notesDirectory || ''}
              onChange={(e) => handleSetNotesDirectory(e.target.value)}
              placeholder="Enter directory path (e.g., /home/user/notes or C:\Users\username\Documents\Notes)"
            />
            <p className="text-xs text-muted-foreground">
              Specify the directory where your notes will be saved. Leave empty
              to use the default location.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </TabsContent>
  );
};

export default TnSettings;
