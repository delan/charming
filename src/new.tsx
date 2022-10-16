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
  PointContext as PointsContext,
  toFragment,
  getHashPoints,
  fixHashPoints,
  ifSequence,
} from "./state";
import {
  AliasType,
  Data,
  findSequenceIndex,
  getAliasBaseIndex,
  getAliasCount,
  getAliasType,
  getAliasValue,
  getNameProperty,
  getSequenceNameByIndices,
  getString,
  isEmoji,
  isEmojiPresentation,
} from "./data";
import { pointsToString } from "./encoding";
import {
  joinSequence,
  pointToYouPlus,
  pointToString16,
  pointToString8,
  pointToEntity10,
  pointsToYouPlus,
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

  const [searchEverOpened, setSearchEverOpened] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const location = useLocation();
  const points = getHashPoints(location.hash, [0]);

  useEffect(() => void fetchAllData().then(setData), []);
  useEffect(() => void fixHashPoints(location.hash!, points));

  useEffect(() => {
    if (data != null) {
      document.title = ifSequence(
        points,
        (x) => pointsToYouPlus(x),
        (x) => `${pointToYouPlus(x)} ${pointToName(data, x)}`,
      );
    }
  }, [data, points]);

  const href = `https://github.com/delan/charming/tree/${__COMMIT_HASH__}`;

  return (
    <div className="Charming">
      <DataContext.Provider value={data}>
        <PointsContext.Provider value={points}>
          <Detail
            search={() => {
              setSearchOpen(true);
              setSearchEverOpened(true);
            }}
          />
          <Map />

          <a href={href} aria-label="source">
            <i className="fab fa-github" aria-hidden="true"></i>
          </a>

          {searchEverOpened && (
            <Search
              query={searchQuery}
              setQuery={setSearchQuery}
              close={() => void setSearchOpen(false)}
              hidden={!searchOpen}
            />
          )}
        </PointsContext.Provider>
      </DataContext.Provider>
    </div>
  );
}

function Detail({ search }: { search: () => void }) {
  const data = useContext(DataContext);
  const points = useContext(PointsContext);

  if (data == null) {
    return (
      <div className="Detail">
        <div className="loading">…</div>
      </div>
    );
  }

  const className = [
    "Detail",
    ...ifSequence(
      points,
      (_) => ["sequence"],
      (_) => [],
    ),
  ].join(" ");

  return (
    <div className={className}>
      <h1>{pointsToYouPlus(points)}</h1>
      <a
        href={toFragment(points)}
        onClick={() => void writeText(pointsToString(points))}
      >
        <Display points={points} />
      </a>
      <p>
        <a href={toFragment(points)} onClick={search}>
          {ifSequence(
            points,
            (x) => {
              const sequenceIndex = findSequenceIndex(data, x);
              if (sequenceIndex == null) return "(sequence)";
              return getSequenceNameByIndices(data, sequenceIndex, 0);
            },
            (x) => pointToName(data, x),
          )}
        </a>
      </p>
      {ifSequence(
        points,
        (x) => (
          <SequenceDetails points={x} />
        ),
        (x) => (
          <PointDetails point={x} />
        ),
      )}
    </div>
  );
}

function PointDetails({ point }: { point: number }) {
  const data = useContext(DataContext)!;
  const emoji = isEmoji(data, point);

  return (
    <>
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
        {emoji && <dt>Emoji properties</dt>}
        {emoji && (
          <dd>
            Emoji_Presentation?{" "}
            {isEmojiPresentation(data, point) ? <>Yes</> : <strong>No</strong>}
          </dd>
        )}
      </dl>
    </>
  );
}

function SequenceDetails({ points }: { points: number[] }) {
  const data = useContext(DataContext)!;

  return (
    <>
      {points.length == 1 && (
        <AliasList
          start={getAliasBaseIndex(data, points[0])}
          count={getAliasCount(data, points[0])}
        />
      )}
      <ul>
        {points.map((x, i) => (
          <li key={i}>
            <a href={toFragment([x])}>
              <span className="choice">
                <Display points={[x]} />
              </span>
              {" "}
              {pointToYouPlus(x)}
              {" "}
              {getNameProperty(data, x)}
            </a>
          </li>
        ))}
      </ul>
      <dl>
        <Pair
          value={joinSequence(points, " ", (x) => pointToString8(x))}
          label="UTF-8"
        />
        <Pair
          value={joinSequence(points, " ", (x) => pointToString16(x))}
          label="UTF-16"
        />
        <Pair
          value={joinSequence(points, " ", (x) => pointToEntity10(x))}
          label="HTML"
        />
      </dl>
    </>
  );
}

function Search({
  query,
  setQuery,
  close,
  hidden,
}: {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  close: () => void;
  hidden: boolean;
}) {
  const data = useContext(DataContext);
  const input = useRef<HTMLInputElement>(null);

  const [results, setResults] = useState([]);

  useEffect(() => {
    if (data != null) {
      search(data, query).then(({ data: results }) => void setResults(results));
    }
  }, [data, query]);

  useEffect(() => void input.current!.focus(), [hidden]);

  return (
    <div className="Search" hidden={hidden}>
      <input
        ref={input}
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
      itemCount={results.length}
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
      <a href={toFragment(x.points)} onClick={close}>
        <span className="choice">
          <Display points={x.points} />
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
  const { points, reason } = result;
  const point = ifSequence(
    points,
    (x) => x[0],
    (x) => x,
  );

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
    case "sequenceValue":
      return (
        <>
          {pointsToYouPlus(points)}
          {space}
          {getSequenceNameByIndices(data, result.sequenceIndex, 0)}
        </>
      );
    case "sequenceName":
      return (
        <>
          {pointsToYouPlus(points)}
          {hint}
          <SubstringMatches
            label={
              getSequenceNameByIndices(
                data,
                result.sequenceIndex,
                result.sequenceNameIndex,
              )!
            }
            query={query}
            offset={result.offset}
          />
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
  const points = useContext(PointsContext);

  if (data == null || points.length > 1) {
    return null;
  }

  const point = points[0];
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
  const points = useContext(PointsContext);
  const point = points.length == 1 ? points[0] : null;

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
  point: number | null;
}) {
  const pointForScroll = point ?? 0;
  const columnCount = Math.floor((width - scrollbar) / 40);
  const rowCount = Math.ceil(1114112 / columnCount);

  const visibleRows = Math.floor(height / 40);
  const rowIndex = Math.floor(pointForScroll / columnCount) - visibleRows / 2;

  const itemData = useMemo(
    () => ({ columnCount, point }),
    [columnCount, point],
  );
  const grid = useRef<FixedSizeGrid | null>(null);

  useEffect(() => {
    if (grid.current != null) {
      const rowIndex = Math.floor(pointForScroll / columnCount);
      grid.current.scrollToItem({ rowIndex });
    }
  }, [pointForScroll]);

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
    <a href={toFragment([point])} className={classes.join(" ")} style={style}>
      <Display points={[point]} />
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
