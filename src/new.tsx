import "core-js/stable";
import "regenerator-runtime/runtime";
import "./new.sass";

import React, { useState, useEffect, useContext } from "react";
import ReactDOM from "react-dom";
import useLocation from "react-use/lib/useLocation";

import { pointToString } from "./encoding";
import {
  DataContext,
  PointContext,
  toFragment,
  getHashPoint,
  fixHashPoint,
} from "./state";
import { Data, fetchAllData, getString } from "./data";

history.scrollRestoration = "manual";

ReactDOM.render(<Charming />, document.querySelector("main"));

function Charming() {
  const [data, setData] = useState<Data | null>(null);
  const location = useLocation();
  const point = getHashPoint(location.hash, 0);

  useEffect(() => void fetchAllData().then(setData), []);
  useEffect(() => void fixHashPoint(point));

  return (
    <DataContext.Provider value={data}>
      <PointContext.Provider value={point}>
        <Detail />
        <Map />
      </PointContext.Provider>
    </DataContext.Provider>
  );
}

function Detail() {
  const data = useContext(DataContext);
  const point = useContext(PointContext);

  if (data == null) {
    return (
      <div className="detail">
        <div className="loading">…</div>
      </div>
    );
  }

  return <div className="detail">{getString(data, "name", point)}</div>;
}

function Map({ start = 0, stop = 384 }: { start?: number; stop?: number }) {
  const point = useContext(PointContext);

  return (
    <div className="map">
      {range(start, stop).map(i => (
        <Cell key={i} point={i} active={i == point} />
      ))}
    </div>
  );
}

function Cell({ point, active = false }: { point: number; active?: boolean }) {
  const className = active ? "active" : undefined;

  return (
    <a href={toFragment(point)} className={className}>
      {pointToString(point)}
    </a>
  );
}

function range(start: number, stop: number): number[] {
  return [...Array(stop - start)].map((_, i) => i + start);
}
