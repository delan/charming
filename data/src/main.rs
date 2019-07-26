mod captures;
mod gc;
mod parse;
mod range;
mod ud;

use std::collections::HashMap;

use failure::Error;

use crate::gc::gc_handler;
use crate::parse::parse;
use crate::range::range_handler;
use crate::ud::ud_handler;

fn main() -> Result<(), Error> {
    let mut gc_labels = HashMap::default();

    parse(
        &mut gc_labels,
        gc_handler,
        "PropertyValueAliases.txt",
        r"^gc *; *(?P<key>[^ ]+) *; *(?P<value>([^ ]+))",
    )?;

    dbg!(&gc_labels);

    let mut ud = points();

    parse(
        &mut ud,
        |sink, captures| ud_handler(&gc_labels, sink, captures),
        "UnicodeData.txt",
        r"^(?P<point>[0-9A-F]+);(?P<name>[^;]+);(?P<gc>[^;]+)",
    )?;

    dbg!(&ud[0x20]);

    let mut block = points();

    parse(
        &mut block,
        range_handler,
        "Blocks.txt",
        r"^(?P<first>[0-9A-F]+)[.][.](?P<last>[0-9A-F]+); (?P<value>.+)",
    )?;

    dbg!(&block[0]);

    let mut age = points();

    parse(
        &mut age,
        range_handler,
        "DerivedAge.txt",
        r"^(?P<first>[0-9A-F]+)(?:[.][.](?P<last>[0-9A-F]+))?\s*;\s*(?P<value>[^ ]+)",
    )?;

    dbg!(&age[0]);

    Ok(())
}

fn points<T: Default>() -> Vec<T> {
    let mut result = Vec::with_capacity(0x110000);
    result.resize_with(0x110000, Default::default);

    result
}
