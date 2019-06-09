import bits from "./data.bits.bin";
import name from "./data.name.bin";
import gc from "./data.gc.bin";
import block from "./data.block.bin";
import age from "./data.age.bin";
import mpy from "./data.mpy.bin";

const paths = [bits, name, gc, block, age, mpy];

export default interface Data {
    string?: Array<string>,
    bits: DataView,
    name: DataView,
    gc: DataView,
    block: DataView,
    age: DataView,
    mpy: DataView,
}

export async function fetchAllData(): Promise<Data> {
    const [bits, name, gc, block, age, mpy] =
        await Promise.all(paths.map(fetchDataView));

    return { bits, name, gc, block, age, mpy };
}

async function fetchDataView(path: string): Promise<DataView> {
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    return new DataView(buffer);
}
