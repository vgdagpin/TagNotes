import "./global.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

import Index from "@/pages/Index";
import Viewer from "@/pages/electron/Viewer";
import NotFound from "@/pages/NotFound";
import NewNote from "@/pages/electron/NewNote";
import Settings from "@/pages/electron/Settings";

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
    <BrowserRouter>
        <RouteBootstrapper />
        <Routes>
            <Route path="/" element={<Index />} />
            <Route path=":noteId" element={<Index />} />
            <Route path="/electron/NewNote" element={<NewNote />} />
            <Route path="/electron/Viewer/:noteId" element={<Viewer />} />
            <Route path="/electron/Settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    </BrowserRouter>
);

export default App;