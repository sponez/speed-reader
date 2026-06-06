import { useState } from "react";
import PreparationScreen from "./screens/preparation/PreparationScreen";
import type { PreparationDraft } from "./screens/preparation/preparationTypes";
import "./App.css";

type AppMode = "preparing";

function App() {
  const [mode] = useState<AppMode>("preparing");
  const [, setLatestDraft] = useState<PreparationDraft | null>(null);

  const handleStart = (draft: PreparationDraft) => {
    setLatestDraft(draft);
  };

  return (
    <>{mode === "preparing" && <PreparationScreen onStart={handleStart} />}</>
  );
}

export default App;
