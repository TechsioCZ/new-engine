import { useEffect } from 'react';

const htmlDemoPath = '/sdk/demo.html';

export default function SdkDemoRoute() {
  useEffect(() => {
    window.location.replace(htmlDemoPath);
  }, []);

  return (
    <>
      <meta content={`0; url=${htmlDemoPath}`} httpEquiv="refresh" />
      <main className="shell:flex shell:min-h-screen shell:items-center shell:justify-center shell:bg-white shell:p-6 shell:text-stone-950">
        <a
          className="shell:rounded-md shell:border shell:border-stone-900/15 shell:px-3 shell:py-2 shell:text-sm shell:font-black shell:text-stone-800 shell:shadow-sm shell:shadow-stone-900/5 shell:focus-visible:outline-3 shell:focus-visible:outline-offset-2 shell:focus-visible:outline-emerald-700/40"
          href={htmlDemoPath}
        >
          HTML demo
        </a>
      </main>
    </>
  );
}
