import "core-js/stable";
import "regenerator-runtime/runtime";
import "./new.sass";

import React, {
  CSSProperties,
  Dispatch,
  SetStateAction,
  useState,
  useEffect,
  useContext,
  useRef,
  useMemo,
  StrictMode,
} from "react";
import ReactDOMClient from "react-dom/client";
import useLocation from "react-use/lib/useLocation";
import {
  FixedSizeGrid,
  FixedSizeList,
  GridChildComponentProps,
  areEqual,
  ListChildComponentProps,
} from "react-window";
import AutoSizer from "react-virtualized-auto-sizer"; // FIXME type definitions
import { writeText } from "clipboard-polyfill";

import {
  DataContext,
  PointContext,
  toFragment,
  getHashPoint,
  fixHashPoint,
} from "./state";
import {
  AliasType,
  Data,
  getAliasBaseIndex,
  getAliasCount,
  getAliasType,
  getAliasValue,
  getNameProperty,
  getString,
} from "./data";
import { pointToString } from "./encoding";
import {
  pointToYouPlus,
  pointToString16,
  pointToString8,
  pointToEntity10,
} from "./formatting";
import { Display } from "./Display";
import { KeyedSearchResult, search, SearchResult } from "./search";
import { nullToDefault } from "./default";
import { fetchAllData } from "./fetch";

const {
  clientWidth: mapContentWidth,
  offsetWidth: mapWidth,
  offsetHeight: mapHeight,
} = document.querySelector("div.Map.measurer") as HTMLElement;

const scrollbar = mapWidth - mapContentWidth;

function Charming() {
  const [data, setData] = useState<Data | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const location = useLocation();
  const point = getHashPoint(location.hash, 0);

  useEffect(() => void fetchAllData().then(setData), []);
  useEffect(() => void fixHashPoint(location.hash!, point));

  useEffect(() => {
    if (data != null) {
      document.title = `${pointToYouPlus(point)} ${pointToName(data, point)}`;
    }
  }, [data, point]);

  const href = `https://github.com/delan/charming/tree/${__COMMIT_HASH__}`;

  return (
    <div className="Charming">
      <DataContext.Provider value={data}>
        <PointContext.Provider value={point}>
          <Detail search={() => void setSearchOpen(true)} />
          <Map />

          <a href={href} aria-label="source">
            <i className="fab fa-github" aria-hidden="true"></i>
          </a>

          {searchOpen && (
            <Search
              query={searchQuery}
              setQuery={setSearchQuery}
              close={() => void setSearchOpen(false)}
            />
          )}
        </PointContext.Provider>
      </DataContext.Provider>
    </div>
  );
}

function Detail({ search }: { search: () => void }) {
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
      <a
        href={toFragment(point)}
        onClick={() => void writeText(pointToString(point))}
      >
        <Display point={point} />
      </a>
      <p>
        <a href={toFragment(point)} onClick={search}>
          {pointToName(data, point)}
        </a>
      </p>
      <AliasList
        start={getAliasBaseIndex(data, point)}
        count={getAliasCount(data, point)}
      />
      <dl>
        <Pair value={pointToString8(point)} label="UTF-8" />
        <Pair value={pointToString16(point)} label="UTF-16" />
        <Pair value={pointToEntity10(point)} label="HTML" />
        <StringPair field="gc" label="General category" />
        <StringPair field="block" label="Block" />
        <StringPair field="age" label="Introduced in" />
        <StringPair field="hjsn" label="Hangul Jamo short name" />
        <StringPair field="uhdef" label="Unihan kDefinition" />
        <StringPair field="uhman" label="Unihan kMandarin" />
      </dl>
    </div>
  );
}

function Search({
  query,
  setQuery,
  close,
}: {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  close: () => void;
}) {
  const data = useContext(DataContext);

  const [results, setResults] = useState([]);

  useEffect(() => {
    if (data != null) {
      search(data, query).then(({ data: results }) => void setResults(results));
    }
  }, [data, query]);

  return (
    <div className="Search">
      <input
        autoFocus={true}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="try “em dash” or “69” or “🏳️‍🌈”"
      />

      <div>
        <AutoSizer>
          {({ width, height }: { width: number; height: number }) => (
            <SearchResultList
              width={width}
              height={height}
              query={query}
              close={close}
              results={results}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  );
}

function SearchResultList({
  width,
  height,
  query,
  close,
  results,
}: {
  width: number;
  height: number;
  query: string;
  close: () => void;
  results: KeyedSearchResult[];
}) {
  const itemData = useMemo(
    () => ({ query, close, results }),
    [query, close, results],
  );

  return (
    <FixedSizeList
      width={width}
      height={height}
      itemCount={Math.min(256, results.length)}
      itemData={itemData}
      innerElementType="ul"
      itemSize={40}
    >
      {SearchResultRow}
    </FixedSizeList>
  );
}

const SearchResultRow = React.memo(function SearchResultRow({
  index,
  style,
  data: { query, close, results },
}: ListChildComponentProps) {
  const x = results[index];
  return (
    <li key={x.key} style={style}>
      <a href={toFragment(x.point)} onClick={close}>
        <span className="choice">
          <Display point={x.point} />
        </span>
        {" "}
        <SearchResultLabel query={query} result={x} />
      </a>
    </li>
  );
},
areEqual);

function SearchResultLabel({
  query,
  result,
}: {
  query: string;
  result: SearchResult;
}) {
  const data = useContext(DataContext);
  const space = " ";
  const { point, reason } = result;

  if (data == null)
    return (
      <>
        {pointToYouPlus(point)}
        {space}???
      </>
    );

  let hint =
    result.reason == "alias" ? (
      <>
        {space}
        <AliasHint type={result.aliasType} />
        {space}
      </>
    ) : (
      <>{space}</>
    );

  switch (reason) {
    case "hex":
      return (
        <>
          U+<b>{pointToYouPlus(point, "")}</b>
          {hint}
          {getNameProperty(data, point)}
        </>
      );
    case "dec":
      return (
        <>
          {pointToYouPlus(point)}
          {space}(<b>{point}</b>
          <sub>10</sub>){hint}
          {getNameProperty(data, point)}
        </>
      );
    case "breakdown":
      return (
        <>
          {pointToYouPlus(point)}
          {hint}
          {getNameProperty(data, point)}
        </>
      );
    case "name":
      return (
        <>
          {pointToYouPlus(point)}
          {hint}
          <SubstringMatches
            label={getNameProperty(data, point)!}
            query={query}
            offset={result.offset}
          />
        </>
      );
    case "uhdef":
      return (
        <>
          {pointToYouPlus(point)}
          {hint}
          <SubstringMatches
            label={getString(data, reason, point)!}
            query={query}
            offset={result.offset}
          />
        </>
      );
    case "alias":
      return (
        <>
          {pointToYouPlus(point)}
          {hint}
          <SubstringMatches
            label={getAliasValue(data, result.aliasIndex)!}
            query={query}
            offset={result.offset}
          />
        </>
      );
  }
}

function AliasHint({ type }: { type: AliasType }) {
  // Unicode 14.0.0 §§ 4.8, 4.9
  // UTS #51 revision 21 § 2.1
  const title = [
    "correction: corrections for serious problems in the character names",
    "control: ISO 6429 names for C0 and C1 control functions, and other commonly occurring names for control codes",
    "alternate: widely used alternate names for format characters",
    "figment: several documented labels for C1 control code points which were never actually approved in any standard",
    "abbreviation: commonly occurring abbreviations (acronyms) for control codes, format characters, spaces, and variation selectors",
    "Unicode_1_Name: old names of characters prior to the prohibition of character name changes in Unicode 2.0",
    "CLDR short name: a name that may change over time, and for emoji, might reflect the preferred depiction more accurately",
  ][type];

  return (
    <small className="AliasHint">
      <abbr title={title}>
        {["corr", "ctrl", "alt", "fig", "abbr", "u1", "cldr"][type]}
      </abbr>
    </small>
  );
}

function SubstringMatches({
  label,
  query,
  offset,
}: {
  label: string;
  query: string;
  offset: number | null;
}) {
  // check if label/query has unusual casefolding behaviour
  if (
    offset == null ||
    query.length == 0 ||
    label.toUpperCase().length != label.length ||
    query.toUpperCase().length != query.length
  ) {
    return <>{label}</>;
  }

  const i = offset,
    j = offset + query.length;
  return (
    <>
      {label.slice(0, i)}
      <b>{label.slice(i, j)}</b>
      {label.slice(j)}
    </>
  );
}

function AliasList({ start, count }: { start: number | null; count: number }) {
  const result = [];

  if (start == null) return null;

  for (let i = start; i < start + count; i++)
    result.push(<AliasPair key={i} index={i} />);

  return <ul className="AliasList">{result}</ul>;
}

function AliasPair({ index }: { index: number }) {
  const data = useContext(DataContext);
  const space = " ";

  if (data == null) return null;

  return (
    <li>
      <span className="marker">
        <AliasHint type={getAliasType(data, index)!} />
        {space}
      </span>
      {getAliasValue(data, index)!}
    </li>
  );
}

function StringPair({
  label,
  field,
}: {
  field: "gc" | "block" | "age" | "hjsn" | "uhdef" | "uhman";
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

  const itemData = useMemo(
    () => ({ columnCount, point }),
    [columnCount, point],
  );
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
  const classes = ["choice"];

  if (active) {
    classes.push("active");
  }

  return (
    <a href={toFragment(point)} className={classes.join(" ")} style={style}>
      <Display point={point} />
    </a>
  );
},
areEqual);

function pointToName(data: Data, point: number) {
  return nullToDefault(getNameProperty(data, point), "(no name)");
}

history.scrollRestoration = "manual";

const root = ReactDOMClient.createRoot(document.querySelector("main")!);
root.render(
  <StrictMode>
    <Charming />
  </StrictMode>,
);
