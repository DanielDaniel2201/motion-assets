import { useEffect, useState } from "react";
import type { BatchDocument } from "./batch/import";
import { blurTextDefinition } from "./assets/blur-text/definition";
import { cardStackDefinition } from "./assets/card-stack/definition";
import { chatDialogDefinition } from "./assets/chat-dialog/definition";
import { countUpDefinition } from "./assets/count-up/definition";
import { logoLoopDefinition } from "./assets/logo-loop/definition";
import { progressBarDefinition } from "./assets/progress-bar/definition";
import { videoPipDefinition } from "./assets/video-pip/definition";
import { BlurTextEditor } from "./components/BlurTextEditor";
import { CardStackEditor } from "./components/CardStackEditor";
import { ChatDialogEditor } from "./components/ChatDialogEditor";
import { CountUpEditor } from "./components/CountUpEditor";
import { GitHubIcon } from "./components/icons";
import { LogoLoopEditor } from "./components/LogoLoopEditor";
import { ProgressBarEditor } from "./components/ProgressBarEditor";
import { VideoPipEditor } from "./components/VideoPipEditor";
import { BatchImporter } from "./components/BatchImporter";
import { BatchPage } from "./components/BatchPage";

const GITHUB_REPO_URL = "https://github.com/DanielDaniel2201/motion-assets";

export function App() {
  const [activeAsset, setActiveAsset] = useState(() => window.location.hash.slice(1));
  const [batch, setBatch] = useState<BatchDocument | null>(null);

  useEffect(() => {
    const syncRoute = () => setActiveAsset(window.location.hash.slice(1));
    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("popstate", syncRoute);
    return () => {
      window.removeEventListener("hashchange", syncRoute);
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  const navigate = (assetId: string) => {
    const hash = assetId ? `#${assetId}` : "";
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
    setActiveAsset(assetId);
  };

  const wrap = (page: React.ReactNode) => <BatchImporter onImport={(imported) => {
    setBatch(imported);
    navigate("batch");
  }}>{page}</BatchImporter>;

  if (activeAsset === "batch" && batch) {
    return wrap(<BatchPage batch={batch} onBack={() => navigate("")} />);
  }

  if (activeAsset === cardStackDefinition.id) {
    return wrap(<CardStackEditor onBack={() => navigate("")} />);
  }

  if (activeAsset === progressBarDefinition.id) {
    return wrap(<ProgressBarEditor onBack={() => navigate("")} />);
  }

  if (activeAsset === chatDialogDefinition.id) {
    return wrap(<ChatDialogEditor onBack={() => navigate("")} />);
  }

  if (activeAsset === videoPipDefinition.id) {
    return wrap(<VideoPipEditor onBack={() => navigate("")} />);
  }

  if (activeAsset === blurTextDefinition.id) {
    return wrap(<BlurTextEditor onBack={() => navigate("")} />);
  }

  if (activeAsset === countUpDefinition.id) {
    return wrap(<CountUpEditor onBack={() => navigate("")} />);
  }

  if (activeAsset === logoLoopDefinition.id) {
    return wrap(<LogoLoopEditor onBack={() => navigate("")} />);
  }

  return wrap(
    <main className="library-shell">
      <header className="topbar library-topbar">
        <div className="brand">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>Motions</span>
        </div>
        <a
          className="github-link"
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open the Motion Assets GitHub repository"
        >
          <GitHubIcon />
        </a>
      </header>
      <section className="motion-library" aria-label="Motion library">
        <button className="motion-item" type="button" onClick={() => navigate(cardStackDefinition.id)}>
          <span className="motion-item-preview card-stack-mini" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className="motion-item-copy">
            <strong>Card Stack</strong>
          </span>
        </button>
        <button className="motion-item" type="button" onClick={() => navigate(progressBarDefinition.id)}>
          <span className="motion-item-preview progress-bar-mini" aria-hidden="true">
            <span className="progress-bar-mini-base" />
            <span className="progress-bar-mini-chapters">
              <em>Intro</em><i /><em>Topic</em><i /><em>Outro</em>
            </span>
          </span>
          <span className="motion-item-copy">
            <strong>Progress Bar</strong>
          </span>
        </button>
        <button className="motion-item" type="button" onClick={() => navigate(videoPipDefinition.id)}>
          <span className="motion-item-preview video-pip-mini" aria-hidden="true">
            <span className="video-pip-mini-window" />
            <span className="video-pip-mini-cursor" />
          </span>
          <span className="motion-item-copy"><strong>Video PiP Drag</strong></span>
        </button>
        <button className="motion-item" type="button" onClick={() => navigate(chatDialogDefinition.id)}>
          <span className="motion-item-preview chat-dialog-mini" aria-hidden="true">
            <i /><span>Review the footage?</span><i /><span>Looks good.</span>
          </span>
          <span className="motion-item-copy"><strong>Chat Dialog</strong></span>
        </button>
        <button className="motion-item" type="button" onClick={() => navigate(blurTextDefinition.id)}>
          <span className="motion-item-preview blur-text-mini" aria-hidden="true"><span>Focus</span></span>
          <span className="motion-item-copy"><strong>Blur Text</strong></span>
        </button>
        <button className="motion-item" type="button" onClick={() => navigate(countUpDefinition.id)}>
          <span className="motion-item-preview count-up-mini" aria-hidden="true"><span /></span>
          <span className="motion-item-copy"><strong>Count Up</strong></span>
        </button>
        <button className="motion-item" type="button" onClick={() => navigate(logoLoopDefinition.id)}>
          <span className="motion-item-preview logo-loop-mini" aria-hidden="true"><span>✦</span><span>◉</span><span>◆</span><span>✺</span><span>✦</span><span>◉</span></span>
          <span className="motion-item-copy"><strong>Logo Loop</strong></span>
        </button>
      </section>
    </main>
  );
}
