import string from "./data.string.json";
import bits from "./data.bits.bin";
import name from "./data.name.bin";
import gc from "./data.gc.bin";
import block from "./data.block.bin";
import age from "./data.age.bin";
import mpy from "./data.mpy.bin";

export interface Data {
    string: string[],
    bits: DataView,
    name: DataView,
    gc: DataView,
    block: DataView,
    age: DataView,
    mpy: DataView,
}

export function fetchAllData(): Promise<Data> {
    return fetchData(bits, name, gc, block, age, mpy);
}

async function fetchData(...paths: string[]): Promise<Data> {
    const [bits, name, gc, block, age, mpy] =
        await Promise.all(paths.map(fetchDataView));

    return { string, bits, name, gc, block, age, mpy };
}

async function fetchDataView(path: string): Promise<DataView> {
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    return new DataView(buffer);
}
