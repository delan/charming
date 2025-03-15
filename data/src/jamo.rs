use color_eyre::eyre;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::Details;
use crate::pool::Popularity;

pub(crate) fn jamo_handler(
    popularity: &mut Popularity,
    sink: &mut [Details],
    captures: Captures,
) -> eyre::Result<()> {
    let point = usize::from_str_radix(captures.try_name("point")?, 16)?;
    let value = captures.try_name("value")?;

    sink[point].hjsn = Some(popularity.vote(value));

    Ok(())
}
