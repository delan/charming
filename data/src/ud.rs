use std::collections::HashMap;

use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;

pub(crate) enum Bits {
    IsSpaceSeparator = 1 << 2,
    IsAnyMark = 1 << 3,
}

pub(crate) fn ud_handler(
    gc_labels: &HashMap<String, String>,
    sink: &mut Vec<Option<(u8, String, String)>>,
    captures: Captures,
) -> Result<(), Error> {
    let point = usize::from_str_radix(captures.name_ok("point")?, 16)?;
    let name = captures.name_ok("name")?;
    let gc = captures.name_ok("gc")?;

    let bits = if gc == "Zs" {
        Bits::IsSpaceSeparator as u8
    } else if gc.starts_with("M") {
        Bits::IsAnyMark as u8
    } else {
        0
    };

    sink[point] = Some((bits, name.to_owned(), gc_labels.get(gc).unwrap().to_owned()));

    Ok(())
}
