use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::Details;
use crate::pool::Popularity;

pub(crate) fn jamo_handler(
    popularity: &mut Popularity,
    sink: &mut Vec<Details>,
    captures: Captures,
) -> Result<(), Error> {
    let point = usize::from_str_radix(captures.name_ok("point")?, 16)?;
    let value = captures.name_ok("value")?;

    sink[point].hjsn = Some(popularity.vote(value));

    Ok(())
}
