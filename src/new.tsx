import "core-js/stable";
import "regenerator-runtime/runtime";
import "./new.sass";

import React, {
  CSSProperties,
  useState,
  useEffect,
  useContext,
  useRef,
} from "react";
import ReactDOM from "react-dom";
import useLocation from "react-use/lib/useLocation";
import { FixedSizeGrid, GridChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer"; // FIXME type definitions
import Div100vh from "react-div-100vh"; // FIXME type definitions

import { pointToString } from "./encoding";
import {
  DataContext,
  PointContext,
  toFragment,
  getHashPoint,
  fixHashPoint,
} from "./state";
import { Data, fetchAllData, getString } from "./data";
import { pointToYouPlus } from "./formatting";

history.scrollRestoration = "manual";

ReactDOM.render(<Charming />, document.querySelector("main"));

function Charming() {
  const [data, setData] = useState<Data | null>(null);
  const location = useLocation();
  const point = getHashPoint(location.hash, 0);

  useEffect(() => void fetchAllData().then(setData), []);
  useEffect(() => void fixHashPoint(point));

  return (
    <Div100vh className="Charming">
      <DataContext.Provider value={data}>
        <PointContext.Provider value={point}>
          <Detail />
          <Map />
        </PointContext.Provider>
      </DataContext.Provider>
    </Div100vh>
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
      <h1>
        {pointToYouPlus(point)} {getString(data, "name", point)}
      </h1>
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
  const point = useContext(PointContext);
  const grid = useRef<FixedSizeGrid | null>(null);

  useEffect(() => {
    if (grid.current != null) {
      const columnCount = grid.current.props.itemData;
      const rowIndex = Math.floor(point / columnCount);
      grid.current.scrollToItem({ rowIndex });
    }
  }, [point]);

  return (
    <div className="Map">
      <AutoSizer>
        {({ width, height }: { width: number; height: number }) => {
          const scrollbar = 20; // FIXME this is a crude guess
          const columnCount = Math.floor((width - scrollbar) / 40);
          const rowCount = Math.ceil(1114112 / columnCount);

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
              itemData={columnCount}
            >
              {MapCell}
            </FixedSizeGrid>
          );
        }}
      </AutoSizer>
    </div>
  );
}

function MapCell({
  rowIndex,
  columnIndex,
  style,
  data: columnCount,
}: GridChildComponentProps) {
  const point = rowIndex * columnCount + columnIndex;
  const selectedPoint = useContext(PointContext);

  if (point >= 0x110000) {
    return null;
  }

  return <Cell point={point} active={point == selectedPoint} style={style} />;
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
