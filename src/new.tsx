import "core-js/stable";
import "regenerator-runtime/runtime";
import "./new.sass";

import React, {
  CSSProperties,
  useState,
  useEffect,
  useContext,
  useRef,
  useMemo,
} from "react";
import ReactDOM from "react-dom";
import useLocation from "react-use/lib/useLocation";
import { FixedSizeGrid, GridChildComponentProps, areEqual } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer"; // FIXME type definitions

import {
  DataContext,
  PointContext,
  toFragment,
  getHashPoint,
  fixHashPoint,
} from "./state";
import { Data, fetchAllData, getString } from "./data";
import { pointToYouPlus } from "./formatting";
import { Display } from "./Display";
import { search } from "./search";

const {
  clientWidth: mapContentWidth,
  offsetWidth: mapWidth,
  offsetHeight: mapHeight,
} = document.querySelector("div.Map.measurer") as HTMLElement;

const scrollbar = mapWidth - mapContentWidth;

function Charming() {
  const [data, setData] = useState<Data | null>(null);
  const location = useLocation();
  const point = getHashPoint(location.hash, 0);

  useEffect(() => void fetchAllData().then(setData), []);
  useEffect(() => void fixHashPoint(point));

  return (
    <div className="Charming">
      <DataContext.Provider value={data}>
        <PointContext.Provider value={point}>
          <Detail />
          <Map />
          <div style={{ position: "absolute", top: "0", left: "0" }}>
            <Search />
          </div>
        </PointContext.Provider>
      </DataContext.Provider>
    </div>
  );
}

function Detail() {
  const data = useContext(DataContext);
  const point = useContext(PointContext);

  if (data == null) {
    return (
      <div className="Detail">
        <div className="loading">…</div>
      </div>
    );
  }

  return (
    <div className="Detail">
      <h1>{pointToYouPlus(point)}</h1>
      <div>
        <Display point={point} />
      </div>
      <p>{getString(data, "name", point)}</p>
      <dl>
        <StringPair field="gc" label="General category" />
        <StringPair field="block" label="Block" />
        <StringPair field="age" label="Introduced in" />
        <StringPair field="mpy" label="Unihan kMandarin" />
      </dl>
    </div>
  );
}

function Search() {
  const data = useContext(DataContext);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (data != null) {
      search(data, query).then(({ data: results }) => void setResults(results));
    }
  }, [data, query]);

  return (
    <>
      <input value={query} onChange={event => setQuery(event.target.value)} />

      <ul>
        {results.slice(0, 9).map(([point, name]) => (
          <li key={point}>
            <a href={toFragment(point)}>
              {pointToYouPlus(point)} {name}
            </a>
          </li>
        ))}
      </ul>
    </>
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
  const point = useContext(PointContext);

  return (
    <div className="Map">
      <AutoSizer defaultWidth={mapWidth} defaultHeight={mapHeight}>
        {({ width, height }: { width: number; height: number }) => (
          <MapGrid width={width} height={height} point={point} />
        )}
      </AutoSizer>
    </div>
  );
}

function MapGrid({
  width,
  height,
  point,
}: {
  width: number;
  height: number;
  point: number;
}) {
  const columnCount = Math.floor((width - scrollbar) / 40);
  const rowCount = Math.ceil(1114112 / columnCount);

  const visibleRows = Math.floor(height / 40);
  const rowIndex = Math.floor(point / columnCount) - visibleRows / 2;

  const itemData = useMemo(() => ({ columnCount, point }), [
    columnCount,
    point,
  ]);
  const grid = useRef<FixedSizeGrid | null>(null);

  useEffect(() => {
    if (grid.current != null) {
      const rowIndex = Math.floor(point / columnCount);
      grid.current.scrollToItem({ rowIndex });
    }
  }, [point]);

  return (
    <FixedSizeGrid
      ref={grid}
      width={width}
      height={height}
      columnWidth={40}
      rowHeight={40}
      columnCount={columnCount}
      rowCount={rowCount}
      overscanRowsCount={16}
      itemData={itemData}
      initialScrollTop={40 * rowIndex}
    >
      {GridCell}
    </FixedSizeGrid>
  );
}

const GridCell = React.memo(
  function GridCell({
    rowIndex,
    columnIndex,
    style,
    data: { columnCount, point: selectedPoint },
  }: GridChildComponentProps) {
    const point = rowIndex * columnCount + columnIndex;

    if (point >= 0x110000) {
      return null;
    }

    return <Cell point={point} active={point == selectedPoint} style={style} />;
  },
  (p, q) => {
    if (
      p.rowIndex != q.rowIndex ||
      p.columnIndex != q.columnIndex ||
      p.data.columnCount != q.data.columnCount
    ) {
      return false;
    }

    const point = p.rowIndex * p.data.columnCount + p.columnIndex;

    return p.data.point != point && q.data.point != point;
  },
);

const Cell = React.memo(function Cell({
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
      <Display point={point} />
    </a>
  );
},
areEqual);

history.scrollRestoration = "manual";

ReactDOM.render(<Charming />, document.querySelector("main"));
