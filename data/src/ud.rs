use std::collections::HashMap;

use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::{Bits, Details};
use crate::pool::Popularity;

pub(crate) fn ud_handler(
    gc_labels: &HashMap<String, String>,
    popularity: &mut Popularity,
    sink: &mut Vec<Details>,
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

    let name = Some(popularity.vote(name));
    let gc = Some(popularity.vote(gc_labels.get(gc).unwrap()));

    sink[point] = Details {
        bits,
        name,
        gc,
        ..Default::default()
    };

    Ok(())
}
