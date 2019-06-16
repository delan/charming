import "core-js/stable";
import "regenerator-runtime/runtime";
import "./new.sass";

import React, { CSSProperties, useState, useEffect, useContext } from "react";
import ReactDOM from "react-dom";
import useLocation from "react-use/lib/useLocation";
import { FixedSizeGrid, GridChildComponentProps } from "react-window";

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

  return (
    <div className="detail">
      <h1>{getString(data, "name", point)}</h1>
      <dl>
        <StringPair field="gc" label="General category" />
        <StringPair field="block" label="Block" />
        <StringPair field="age" label="Introduced in" />
        <StringPair field="mpy" label="Unihan kMandarin" />
      </dl>
    </div>
  );
}

function StringPair({
  label,
  field,
}: {
  field: "gc" | "block" | "age" | "mpy";
  label: string;
}) {
  const data = useContext(DataContext);
  const point = useContext(PointContext);

  if (data == null) {
    return null;
  }

  return <Pair label={label} value={getString(data, field, point)} />;
}

function Pair({ label, value }: { label: string; value: string | null }) {
  if (value == null) {
    return null;
  }

  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function Map() {
  return (
    <FixedSizeGrid
      className="map"
      width={670}
      height={640}
      columnWidth={40}
      rowHeight={40}
      columnCount={16}
      rowCount={1114112 / 16}
      overscanRowsCount={16}
    >
      {MapCell}
    </FixedSizeGrid>
  );
}

function MapCell({ rowIndex, columnIndex, style }: GridChildComponentProps) {
  const i = rowIndex * 16 + columnIndex;
  const point = useContext(PointContext);
  return <Cell point={i} active={i == point} style={style} />;
}

function Cell({
  point,
  active = false,
  style,
}: {
  point: number;
  active?: boolean;
  style: CSSProperties;
}) {
  const className = active ? "active" : undefined;

  return (
    <a href={toFragment(point)} className={className} style={style}>
      {pointToString(point)}
    </a>
  );
}

function range(start: number, stop: number): number[] {
  return [...Array(stop - start)].map((_, i) => i + start);
}
