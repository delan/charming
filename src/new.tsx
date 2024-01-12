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
  getNextClusterBreak,
  getSequenceNameByIndices,
  getString,
  isEmoji,
  isEmojiPresentation,
} from "./data";
import { pointsToString, stringToPoints } from "./encoding";
import {
  joinSequence,
  pointToYouPlus,
  pointToString16,
  pointToString8,
  pointToEntity10,
  pointsToYouPlus,
  pointsToYouPlusEllipsis,
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

  const openSearch = () => {
    setSearchOpen(true);
    setSearchEverOpened(true);
  };

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

  useEffect(() => {
    // Data is required to determine grapheme cluster breaks in pasted strings
    if (!data) return;
    // Keyboard interaction only applies when viewing the map
    if (searchOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key == "/") {
        e.preventDefault();
        openSearch();
      }
    };

    const onCopy = (e: ClipboardEvent) => {
      // If the user is in an input field, don’t touch the event
      if (e.target instanceof Node && e.target?.nodeName == "INPUT") return;

      // If the user is trying to copy text normally, don't prevent them from doing so
      const selection = window.getSelection();
      if (selection && selection.type == "Range") return;

      e.preventDefault();

      // Need to use window.location.hash, not just location.hash, so that the closure captures
      // window (and thus location.hash is updated) rather than capturing location (where hash would
      // not be updated)
      // Avoids a dependency on points which would cause the effect to re-run often
      const points = getHashPoints(window.location.hash, [0]);

      e.clipboardData?.setData("text/plain", pointsToString(points));
    };

    const onPaste = (e: ClipboardEvent) => {
      // If the user is in an input field, don’t touch the event
      if (e.target instanceof Node && e.target?.nodeName == "INPUT") return;

      // clipboardData may be null if the clipboard is empty, text may be empty: don't process
      // either case
      const text = e.clipboardData?.getData("text/plain");
      if (!text) return;

      e.preventDefault();

      const firstBreak = getNextClusterBreak(data, text, null);
      if (!firstBreak) return;
      const startUnitIndex = firstBreak.startUnitIndex;

      const secondBreak = getNextClusterBreak(data, text, firstBreak);
      if (!secondBreak) return;
      const endUnitIndex = secondBreak.startUnitIndex;

      const thirdBreak = getNextClusterBreak(data, text, secondBreak);
      if (!thirdBreak) {
        // Only one grapheme cluster in the pasted string
        const cluster = text.slice(startUnitIndex, endUnitIndex);
        // Same window vs location capture issue as in onCopy
        window.location.hash = toFragment(stringToPoints(cluster));
      } else {
        // Multiple grapheme clusters in the pasted string
        setSearchQuery(text);
        openSearch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("copy", onCopy);
    window.addEventListener("paste", onPaste);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("paste", onPaste);
    };
  }, [data, searchOpen]);

  return (
    <div className="Charming">
      <DataContext.Provider value={data}>
        <PointsContext.Provider value={points}>
          <Detail search={openSearch} />
          <Map />
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

  const href = `https://github.com/delan/charming/tree/${__COMMIT_HASH__}`;

  const copy = () => void writeText(pointsToString(points));

  return (
    <div className={className}>
      <div className="toolbar">
        <a href={toFragment(points)} aria-label="search" onClick={search}>
          <span className="material-symbols-outlined" aria-hidden="true">
            {/* search */}
          </span>
        </a>
        <a href={toFragment(points)} aria-label="copy" onClick={copy}>
          <span className="material-symbols-outlined" aria-hidden="true">
            {/* content_copy */}
          </span>
        </a>
        <span className="space" />
        <a href={href} aria-label="source">
          <GithubIcon />
        </a>
      </div>
      <h1>{pointsToYouPlus(points)}</h1>
      <span className="big">
        <Display points={points} />
      </span>
      <p>
        {ifSequence(
          points,
          (x) => {
            const sequenceIndex = findSequenceIndex(data, x);
            if (sequenceIndex == null) return "(sequence)";
            return getSequenceNameByIndices(data, sequenceIndex, 0);
          },
          (x) => pointToName(data, x),
        )}
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
  const points = useContext(PointsContext);
  const input = useRef<HTMLInputElement>(null);

  const [results, setResults] = useState([]);

  useEffect(() => {
    if (data != null) {
      search(data, query).then(({ data: results }) => void setResults(results));
    }
  }, [data, query]);

  useEffect(() => void input.current!.focus(), [hidden]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key == "Escape") {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className="Search" hidden={hidden}>
      <div className="toolbar">
        <a href={toFragment(points)} aria-label="close" onClick={close}>
          <span className="material-symbols-outlined" aria-hidden="true">
            {/* close */}
          </span>
        </a>
        <input
          ref={input}
          autoFocus={true}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="try “em” or “69” or “🏳️‍🌈”"
        />
      </div>
      <div className="results">
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

  const space = " ";
  const useSequenceStyle = false;
  const classes = (useSequenceStyle ? ["sequence"] : []).join(" ");

  const hint =
    x.reason == "alias" ? (
      <>
        {space}
        <span>
          <AliasHint type={x.aliasType} />
        </span>
        {space}
      </>
    ) : (
      <>{space}</>
    );

  return (
    <li key={x.key} className={classes} style={style}>
      <a href={toFragment(x.points)} onClick={close}>
        <span className="choice">
          <Display points={x.points} />
        </span>
        {hint}
        <span className="label">
          <SearchResultLabel
            query={query}
            result={x}
            useSequenceStyle={useSequenceStyle}
          />
        </span>
      </a>
    </li>
  );
}, areEqual);

function SearchResultLabel({
  query,
  result,
  useSequenceStyle,
}: {
  query: string;
  result: SearchResult;
  useSequenceStyle: boolean;
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
        <span>{pointToYouPlus(point)}</span>
        {space}
        <span>???</span>
      </>
    );

  const separator = useSequenceStyle ? <br /> : <>{space}</>;

  switch (reason) {
    case "hex":
      return (
        <>
          U+<b>{pointToYouPlus(point, "")}</b>
          {separator}
          {getNameProperty(data, point)}
        </>
      );
    case "dec":
      return (
        <>
          {pointToYouPlus(point)}
          {space}(<b>{point}</b>
          <sub>10</sub>){separator}
          {getNameProperty(data, point)}
        </>
      );
    case "breakdown":
      return (
        <>
          {pointToYouPlus(point)}
          {separator}
          {getNameProperty(data, point)}
        </>
      );
    case "sequenceValue":
      return (
        <>
          {pointsToYouPlusEllipsis(points)}
          {separator}
          {getSequenceNameByIndices(data, result.sequenceIndex, 0)}
        </>
      );
    case "sequenceName":
      return (
        <>
          {pointsToYouPlusEllipsis(points)}
          {separator}
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
          {separator}
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
          {separator}
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
          {separator}
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
}, areEqual);

function pointToName(data: Data, point: number) {
  return nullToDefault(getNameProperty(data, point), "(no name)");
}

function GithubIcon() {
  // from https://fontawesome.com/icons/github?f=brands&s=solid
  return (
    <svg
      className="icon"
      xmlns="http://www.w3.org/2000/svg"
      height="16"
      width="15.5"
      viewBox="0 0 496 512"
    >
      {/* Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc. */}
      <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3 .7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3 .3 2.9 2.3 3.9 1.6 1 3.6 .7 4.3-.7 .7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3 .7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3 .7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />
    </svg>
  );
}

history.scrollRestoration = "manual";

const root = ReactDOMClient.createRoot(document.querySelector("main")!);
root.render(
  <StrictMode>
    <Charming />
  </StrictMode>,
);
