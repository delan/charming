use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::{Bits, Details};
use crate::pool::Popularity;

pub(crate) fn ur_handler(
    popularity: &mut Popularity,
    sink: &mut Vec<Details>,
    captures: Captures,
) -> Result<(), Error> {
    let point = usize::from_str_radix(captures.name_ok("point")?, 16)?;
    let key = captures.name_ok("key")?;
    let value = captures.name_ok("value")?;

    match key {
        "kDefinition" => {
            // FIXME assert!(sink[point].name.is_none());
            sink[point].uhdef = Some(popularity.vote(value));
            sink[point].bits |= Bits::KdefinitionExists as u8;
        }
        "kMandarin" => {
            sink[point].uhman = Some(popularity.vote(value));
        }
        _ => {}
    }

    Ok(())
}
