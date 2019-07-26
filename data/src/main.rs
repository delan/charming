mod captures;
mod gc;
mod parse;
mod range;

use std::collections::HashMap;

use failure::Error;

use crate::gc::gc_handler;
use crate::parse::parse;
use crate::range::range_handler;

fn main() -> Result<(), Error> {
    let mut gc = HashMap::default();

    parse(
        &mut gc,
        gc_handler,
        "PropertyValueAliases.txt",
        r"^gc *; *(?P<key>[^ ]+) *; *(?P<value>([^ ]+))",
    )?;

    dbg!(gc);

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
