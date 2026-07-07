import { createContext, useContext, ReactNode } from 'react';

interface CreateActionsContextType {
  onCreateTeam?: () => void;
  onCreateFile?: () => void;
}

export const CreateActionsContext = createContext<CreateActionsContextType>({});

interface CreateActionsProviderProps {
  children: ReactNode;
  onCreateTeam?: () => void;
  onCreateFile?: () => void;
}

export function CreateActionsProvider({
  children,
  onCreateTeam,
  onCreateFile,
}: CreateActionsProviderProps) {
  return (
    <CreateActionsContext.Provider value={{ onCreateTeam, onCreateFile }}>
      {children}
    </CreateActionsContext.Provider>
  );
}

export function useCreateActions() {
  return useContext(CreateActionsContext);
}
