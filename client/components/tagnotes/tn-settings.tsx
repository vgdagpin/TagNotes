import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TabsContent } from "@/components/ui/tabs";
import { IoSettings, IoSave, IoColorPalette, IoDocument, IoInformationCircle } from "react-icons/io5";

type TnSettingsProps = {
  onClose?: () => void;
};

const TnSettings = ({ onClose }: TnSettingsProps) => {
  const [appName, setAppName] = useState("Notes App");
  const [theme, setTheme] = useState("system");
  const [autoSave, setAutoSave] = useState(true);

  const handleSave = () => {
    // Save settings to localStorage or backend
    localStorage.setItem('notesSettings', JSON.stringify({
      appName,
      theme,
      autoSave
    }));
    
    // Show success message or close
    console.log('Settings saved');
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
            <IoSettings className="h-5 w-5" />
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
        {/* General Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <IoDocument className="h-4 w-4" />
            <h3 className="text-lg font-medium">General</h3>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="app-name">Application Name</Label>
            <Input
              id="app-name"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Enter app name..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auto-save">Auto Save</Label>
            <div className="flex items-center space-x-2">
              <input
                id="auto-save"
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-muted-foreground">
                Automatically save changes
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Appearance Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <IoColorPalette className="h-4 w-4" />
            <h3 className="text-lg font-medium">Appearance</h3>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        <Separator />

        {/* About Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <IoInformationCircle className="h-4 w-4" />
            <h3 className="text-lg font-medium">About</h3>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Build:</strong> 2024.01.15</p>
            <p><strong>Notes:</strong> Sectional note-taking application</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <Button onClick={handleSave} className="w-full">
            <IoSave className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </TabsContent>
  );
};

export default TnSettings;
