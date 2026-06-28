const demoPath = '/sdk/demo.html';

export default function RootPage() {
  return (
    <main className="shell:flex shell:min-h-screen shell:items-center shell:justify-center shell:bg-slate-50 shell:p-6 shell:text-slate-950">
      <a className="shell:font-semibold shell:underline shell:underline-offset-4" href={demoPath}>
        Open Smart Suggest demo
      </a>
    </main>
  );
}
