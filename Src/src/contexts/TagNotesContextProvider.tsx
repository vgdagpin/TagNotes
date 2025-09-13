import { ITagNotesService } from '@/shared/ITagNotesService';
import { createContext, ReactNode, useContext, useMemo } from 'react';

export const TagNotesContext = createContext<ITagNotesService | undefined>(undefined);

export const useTagNotesContext = () => {
	const context = useContext(TagNotesContext);

	if (!context) {
		throw new Error('useTagNotesContext must be used within a TagNotesContextProvider');
	}

	return context;
};

interface TagNotesContextProviderProps {
	children: ReactNode;
	service: ITagNotesService;
}

export const TagNotesContextProvider = ({ children, service }: TagNotesContextProviderProps) => {
	const tagNotesService = useMemo<ITagNotesService>(() => service, [service]);

	return <TagNotesContext.Provider value={tagNotesService}>{children}</TagNotesContext.Provider>;
};
