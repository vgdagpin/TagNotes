import { useLocation } from "react-router-dom";

export default function NewNote() {

    console.log('new note', useLocation());

    

    return (
        <div className="h-screen bg-background flex">
            <div className="flex-1 min-w-0"> Test
            </div>
        </div>
    );
}
