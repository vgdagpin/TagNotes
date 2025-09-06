import ReactDOM from 'react-dom/client'
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

import App from './App'
import { TagNotesContextProvider } from './contexts/TagNotesContextProvider';
import { ElectronTagNotesService } from './services/ElectronTagNotesService';
import { TagNotesService } from './services/TagNotesService';

const electronApi: any = (window as any).electronAPI;
const injectedService = electronApi ? new ElectronTagNotesService(electronApi) : new TagNotesService();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <FluentProvider theme={webLightTheme}>
        <TagNotesContextProvider service={injectedService}>
            <App />
        </TagNotesContextProvider>
    </FluentProvider>
)