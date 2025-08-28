import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

import { Trash, Image } from '../tn-icons';
import { Section } from "@shared/models";
import axios from "axios";
import { DialogTitle } from "@radix-ui/react-dialog";

type TnSectionImageProps = {
  section: Section;
  noteId: string;

  onDeleteSection?: (sectionId: string) => void;
};

const TnSectionImage = ({
  section,
  noteId,
  onDeleteSection,
}: TnSectionImageProps) => {
  const handleDelete = () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this section? This action cannot be undone.",
      )
    )
      return;

    axios.delete(`/api/notes/${noteId}/deleteSection/${section.id}`);

    onDeleteSection?.call(null, section.id);
  };

  return (
    <div className="note-section border border-border rounded-md pb-2 pl-2 pr-2 group hover:border-accent transition-colors min-w-0 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-muted-foreground">
          <Image className="w-3" />
        </div>

        {/* Hover controls */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete()}
            className="text-destructive hover:text-destructive"
          >
            <Trash className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Section Content */}
      {section.imageData && (
        <Dialog>
          <DialogTrigger asChild>
            <div className="cursor-pointer">
              <img
                src={section.imageData}
                alt={section.content}
                className="max-w-xs h-32 object-cover rounded border hover:opacity-80 transition-opacity"
              />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogTitle>Image</DialogTitle>
            <img
              src={section.imageData}
              alt={section.content}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TnSectionImage;
