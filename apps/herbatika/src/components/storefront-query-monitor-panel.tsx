"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { useEffect, useMemo, useState } from "react";
import {
  getStorefrontMonitorSnapshot,
  printStorefrontMonitorSummary,
  resetStorefrontMonitor,
  subscribeStorefrontMonitor,
  type StorefrontMonitorSnapshot,
} from "@/lib/storefront/query-monitor";

const sectionClassName = "rounded-xl border border-black/10 bg-white p-4";

const formatRate = (numerator: number, denominator: number): string => {
  if (denominator <= 0) {
    return "0%";
  }
  return `${Math.round((numerator / denominator) * 100)}%`;
};

export function StorefrontQueryMonitorPanel() {
  const [snapshot, setSnapshot] = useState<StorefrontMonitorSnapshot>(() =>
    getStorefrontMonitorSnapshot(),
  );

  useEffect(() => {
    return subscribeStorefrontMonitor(setSnapshot);
  }, []);

  const hitRatio = useMemo(() => {
    const total =
      snapshot.query.cacheHit +
      snapshot.query.cacheStale +
      snapshot.query.cacheMiss;
    return formatRate(snapshot.query.cacheHit, total);
  }, [snapshot.query.cacheHit, snapshot.query.cacheMiss, snapshot.query.cacheStale]);

  const prefetchReuseRatio = useMemo(() => {
    const total = snapshot.prefetch.reuseHit + snapshot.prefetch.reuseMiss;
    return formatRate(snapshot.prefetch.reuseHit, total);
  }, [snapshot.prefetch.reuseHit, snapshot.prefetch.reuseMiss]);

  return (
    <section className={sectionClassName}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Storefront cache/prefetch monitor</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              printStorefrontMonitorSummary();
            }}
            size="sm"
            theme="outlined"
            variant="secondary"
          >
            Print summary
          </Button>
          <Button
            onClick={() => {
              resetStorefrontMonitor();
            }}
            size="sm"
            theme="outlined"
            variant="secondary"
          >
            Reset counters
          </Button>
        </div>
      </header>

      <div className="mb-3 flex flex-wrap gap-2">
        <Badge variant={snapshot.query.cacheMiss === 0 ? "success" : "warning"}>
          {`cache hit ratio: ${hitRatio}`}
        </Badge>
        <Badge
          variant={
            snapshot.prefetch.reuseMiss === 0 ? "success" : "warning"
          }
        >
          {`prefetch reuse hit ratio: ${prefetchReuseRatio}`}
        </Badge>
        <Badge
          variant={snapshot.network.storeServer5xx === 0 ? "success" : "danger"}
        >
          {`store 5xx: ${snapshot.network.storeServer5xx}`}
        </Badge>
        <Badge
          variant={snapshot.network.storeFailed === 0 ? "success" : "warning"}
        >
          {`store failed(non-abort): ${snapshot.network.storeFailed}`}
        </Badge>
        <Badge
          variant={snapshot.network.searchServer5xx === 0 ? "success" : "danger"}
        >
          {`search 5xx: ${snapshot.network.searchServer5xx}`}
        </Badge>
        <Badge
          variant={snapshot.network.searchFailed === 0 ? "success" : "warning"}
        >
          {`search failed(non-abort): ${snapshot.network.searchFailed}`}
        </Badge>
      </div>

      <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border-secondary p-3">
          <p className="font-semibold">Observer cache</p>
          <p>{`hit: ${snapshot.query.cacheHit}`}</p>
          <p>{`stale: ${snapshot.query.cacheStale}`}</p>
          <p>{`miss: ${snapshot.query.cacheMiss}`}</p>
        </div>

        <div className="rounded-lg border border-border-secondary p-3">
          <p className="font-semibold">Prefetch</p>
          <p>{`fetch started: ${snapshot.prefetch.fetchStarted}`}</p>
          <p>{`fetch success: ${snapshot.prefetch.fetchSuccess}`}</p>
          <p>{`fetch error: ${snapshot.prefetch.fetchError}`}</p>
          <p>{`reuse hit: ${snapshot.prefetch.reuseHit}`}</p>
          <p>{`reuse miss: ${snapshot.prefetch.reuseMiss}`}</p>
        </div>

        <div className="rounded-lg border border-border-secondary p-3">
          <p className="font-semibold">Store API network</p>
          <p>{`requests: ${snapshot.network.storeRequests}`}</p>
          <p>{`2xx: ${snapshot.network.storeOk2xx}`}</p>
          <p>{`4xx: ${snapshot.network.storeClient4xx}`}</p>
          <p>{`5xx: ${snapshot.network.storeServer5xx}`}</p>
          <p>{`aborted: ${snapshot.network.storeAborted}`}</p>
          <p>{`failed(non-abort): ${snapshot.network.storeFailed}`}</p>
        </div>

        <div className="rounded-lg border border-border-secondary p-3">
          <p className="font-semibold">Search API network</p>
          <p>{`requests: ${snapshot.network.searchRequests}`}</p>
          <p>{`2xx: ${snapshot.network.searchOk2xx}`}</p>
          <p>{`4xx: ${snapshot.network.searchClient4xx}`}</p>
          <p>{`5xx: ${snapshot.network.searchServer5xx}`}</p>
          <p>{`aborted: ${snapshot.network.searchAborted}`}</p>
          <p>{`failed(non-abort): ${snapshot.network.searchFailed}`}</p>
        </div>
      </div>
    </section>
  );
}
