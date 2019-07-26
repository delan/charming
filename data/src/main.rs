mod age;
mod block;
mod captures;
mod details;
mod ed;
mod gc;
mod na;
mod parse;
mod range;
mod ud;
mod ur;

use std::collections::HashMap;

use failure::Error;

use crate::age::age_handler;
use crate::block::block_handler;
use crate::ed::ed_handler;
use crate::gc::gc_handler;
use crate::na::na_handler;
use crate::parse::parse;
use crate::ud::ud_handler;
use crate::ur::ur_handler;

fn main() -> Result<(), Error> {
    let mut gc_labels = HashMap::default();

    parse(
        &mut gc_labels,
        gc_handler,
        "PropertyValueAliases.txt",
        r"^gc *; *(?P<key>[^ ]+) *; *(?P<value>([^ ]+))",
    )?;

    let mut ud = points();

    parse(
        &mut ud,
        |sink, captures| ud_handler(&gc_labels, sink, captures),
        "UnicodeData.txt",
        r"^(?P<point>[0-9A-F]+);(?P<name>[^;]+);(?P<gc>[^;]+)",
    )?;

    parse(
        &mut ud,
        block_handler,
        "Blocks.txt",
        r"^(?P<first>[0-9A-F]+)[.][.](?P<last>[0-9A-F]+); (?P<value>.+)",
    )?;

    parse(
        &mut ud,
        age_handler,
        "DerivedAge.txt",
        r"^(?P<first>[0-9A-F]+)(?:[.][.](?P<last>[0-9A-F]+))?\s*;\s*(?P<value>[^ ]+)",
    )?;

    parse(
        &mut ud,
        na_handler,
        "NameAliases.txt",
        r"^(?P<point>[0-9A-F]+);(?P<alias>[^;]+);(?P<type>[^;]+)",
    )?;

    parse(
        &mut ud,
        ur_handler,
        "Unihan_Readings.txt",
        r"^U[+](?P<point>[0-9A-F]+)\t(?P<key>kMandarin|kDefinition)\t(?P<value>.+)",
    )?;

    parse(
        &mut ud,
        ed_handler,
        "emoji-data.txt",
        r"^(?P<first>[0-9A-F]+)(?:[.][.](?P<last>[0-9A-F]+))?\s*;\s*(?P<value>[^ ]+)",
    )?;

    Ok(())
}

fn points<T: Default>() -> Vec<T> {
    let mut result = Vec::with_capacity(0x110000);
    result.resize_with(0x110000, Default::default);

    result
}
