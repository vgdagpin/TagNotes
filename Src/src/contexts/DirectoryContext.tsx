import { DirectoryContextService, IDirectoryContextService } from "@/shared/DirectoryContextService";
import { createContext, ReactNode, useContext } from "react";



export const DirectoryContext = createContext<IDirectoryContextService | undefined>(undefined);

export const useDirectoryContext = () => {
	const context = useContext(DirectoryContext);

	if (!context) {
		throw new Error("useDirectoryContext must be used within a DirectoryProvider");
	}

	return context;
}

export const DirectoryContextProvider = ({ children }: { children: ReactNode }) => {
	const directoryService = new DirectoryContextService();

	return (
		<DirectoryContext.Provider value={directoryService}>
			{children}
		</DirectoryContext.Provider>
	);
};