import info from "../data/data.info.json";
import string from "../data/data.string.bin";
import bits from "../data/data.bits.bin";
import ebits from "../data/data.ebits.bin";
import pagebits from "../data/data.pagebits.bin";
import name from "../data/data.name.bin";
import aliasc from "../data/data.aliasc.bin";
import aliasi from "../data/data.aliasi.bin";
import aliass from "../data/data.aliass.bin";
import aliast from "../data/data.aliast.bin";
import dnrp from "../data/data.dnrp.bin";
import gb from "../data/data.gb.bin";
import gc from "../data/data.gc.bin";
import block from "../data/data.block.bin";
import age from "../data/data.age.bin";
import hlvt from "../data/data.hlvt.bin";
import hjsn from "../data/data.hjsn.bin";
import uhdef from "../data/data.uhdef.bin";
import uhman from "../data/data.uhman.bin";
import seqb from "../data/data.seqb.bin";
import seqp from "../data/data.seqp.bin";
import seqn from "../data/data.seqn.bin";

import { Data } from "./data";

export function fetchAllData(): Promise<Data> {
  return fetchData(
    string,
    bits,
    ebits,
    pagebits,
    name,
    aliasc,
    aliasi,
    aliass,
    aliast,
    dnrp,
    gb,
    gc,
    block,
    age,
    hlvt,
    hjsn,
    uhdef,
    uhman,
    seqb,
    seqp,
    seqn,
  );
}

async function fetchData(
  stringPath: string,
  ...paths: string[]
): Promise<Data> {
  const [
    string,
    [
      bits,
      ebits,
      pagebits,
      name,
      aliasc,
      aliasi,
      aliass,
      aliast,
      dnrp,
      gb,
      gc,
      block,
      age,
      hlvt,
      hjsn,
      uhdef,
      uhman,
      seqb,
      seqp,
      seqn,
    ],
  ] = await Promise.all([
    fetchJson<string[]>(stringPath),
    Promise.all(paths.map(fetchDataView)),
  ]);

  return {
    info,
    string,
    bits,
    ebits,
    pagebits,
    name,
    aliasc,
    aliasi,
    aliass,
    aliast,
    dnrp,
    gb,
    gc,
    block,
    age,
    hlvt,
    hjsn,
    uhdef,
    uhman,
    seqb,
    seqp,
    seqn,
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  return response.json();
}

async function fetchDataView(path: string): Promise<DataView> {
  const response = await fetch(path);
  const buffer = await response.arrayBuffer();
  return new DataView(buffer);
}
