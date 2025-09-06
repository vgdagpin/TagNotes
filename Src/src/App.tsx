import "./global.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

import Index from "@/pages/Index";
import Viewer from "@/pages/Viewer";
import NotFound from "@/pages/NotFound";
import NewNote from "./pages/NewNote";
import { DirectoryContextProvider } from "./contexts/DirectoryContext";

function RouteBootstrapper() {
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            let desired = url.searchParams.get('route');
            if (!desired && window.location.hash && window.location.hash.startsWith('#/')) {
                desired = window.location.hash.substring(1);
            }
            if (desired && desired !== location.pathname) {
                navigate(desired, { replace: true });
            }
        } catch { }
        // run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
}

const App = () => (
    <DirectoryContextProvider>
        <BrowserRouter>
            <RouteBootstrapper />
            <Routes>
                <Route path="/" element={<Index />} />
                <Route path=":noteId" element={<Index />} />
                <Route path="/viewer/new" element={<NewNote />} />
                <Route path="/viewer/:noteId" element={<Viewer />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    </DirectoryContextProvider>
);

export default App;