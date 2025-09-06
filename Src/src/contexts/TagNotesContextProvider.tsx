import { ITagNotesService } from "@/shared/ITagNotesService";
import { TagNotesService } from "@/services/TagNotesService";
import { createContext, ReactNode, useContext } from "react";

export const TagNotesContext = createContext<ITagNotesService | undefined>(undefined);

export const useTagNotesContext = () => {
	const context = useContext(TagNotesContext);

	if (!context) {
		throw new Error("useTagNotesContext must be used within a TagNotesContextProvider");
	}

	return context;
}

export const TagNotesContextProvider = ({ children }: { children: ReactNode }) => {
	const tagNotesService = new TagNotesService();

	return (
		<TagNotesContext.Provider value={tagNotesService}>
			{children}
		</TagNotesContext.Provider>
	);
};