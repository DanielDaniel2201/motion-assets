import { useEffect, useState } from "react";
import { cardStackDefinition } from "./assets/card-stack/definition";
import { progressBarDefinition } from "./assets/progress-bar/definition";
import { CardStackEditor } from "./components/CardStackEditor";
import { ProgressBarEditor } from "./components/ProgressBarEditor";

export function App() {
  const [activeAsset, setActiveAsset] = useState(() => window.location.hash.slice(1));

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

  if (activeAsset === cardStackDefinition.id) {
    return <CardStackEditor onBack={() => navigate("")} />;
  }

  if (activeAsset === progressBarDefinition.id) {
    return <ProgressBarEditor onBack={() => navigate("")} />;
  }

  return (
    <main className="library-shell">
      <header className="topbar library-topbar">
        <div className="brand">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>Motion Assets</span>
        </div>
      </header>
      <section className="motion-library" aria-label="Motion library">
        <button className="motion-item" type="button" onClick={() => navigate(cardStackDefinition.id)}>
          <span className="motion-item-preview card-stack-mini" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className="motion-item-copy">
            <strong>Card Stack</strong>
            <span>2–8 images</span>
          </span>
        </button>
        <button className="motion-item" type="button" onClick={() => navigate(progressBarDefinition.id)}>
          <span className="motion-item-preview progress-bar-mini" aria-hidden="true">
            <span className="progress-bar-mini-ticks">
              <i /><i /><i /><i /><i /><i /><i /><i /><i />
            </span>
            <span className="progress-bar-mini-track">
              <span className="progress-bar-mini-fill" />
              <span className="progress-bar-mini-head" />
            </span>
            <span className="progress-bar-mini-labels">
              <em>开场</em>
              <em>主题</em>
              <em>总结</em>
            </span>
          </span>
          <span className="motion-item-copy">
            <strong>Progress Bar</strong>
            <span>Duration + chapters</span>
          </span>
        </button>
      </section>
    </main>
  );
}
