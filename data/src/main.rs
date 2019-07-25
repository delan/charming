mod captures;
mod gc;
mod parse;

use std::collections::HashMap;

use failure::Error;

use crate::gc::gc_handler;
use crate::parse::parse;

fn main() -> Result<(), Error> {
    let mut gc = HashMap::default();

    parse(
        &mut gc,
        gc_handler,
        "PropertyValueAliases.txt",
        r"^gc *; *(?P<key>[^ ]+) *; *(?P<value>([^ ]+))",
    )?;

    dbg!(gc);

    Ok(())
}
