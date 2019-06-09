import { stringToUnits16, stringToUnits8, pointToString, isSurrogate } from "./encoding";

export function toHexadecimal(value: number, length = 0): string {
    return value.toString(16).toUpperCase().padStart(length, "0");
}

export function pointToYouPlus(point: number): string {
    return `U+${toHexadecimal(point, 4)}`;
}

export function pointToString16(point: number): string | null {
    if (isSurrogate(point)) {
        return null;
    }

    return stringToUnits16(pointToString(point))
        .map(x => toHexadecimal(x, 4)).join(" ");
}

export function pointToString8(point: number): string | null {
    if (isSurrogate(point)) {
        return null;
    }

    return stringToUnits8(pointToString(point))
        .map(x => toHexadecimal(x, 2)).join(" ");
}

export function pointToEntity10(point: number): string | null {
    // HTML § 12.1.4
    if (
        point >= 0x0000 && point < 0x0009
        || point >= 0x000B && point < 0x000C
        || point >= 0x000D && point < 0x0020
        || point >= 0x007F && point < 0x00A0
        || point >= 0xFDD0 && point < 0xFDF0
        || (point & 0xFFFF) == 0xFFFE
    ) {
        return null;
    }

    return `&#${point};`;
}
