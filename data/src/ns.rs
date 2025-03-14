use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::pool::Popularity;
use crate::sequence::Sequences;

pub(crate) fn ns_handler(
    popularity: &mut Popularity,
    sequences: &mut Sequences,
    captures: Captures,
) -> Result<(), Error> {
    let points = captures
        .name_ok("points")?
        .split(" ")
        .map(|x| usize::from_str_radix(x, 16))
        .collect::<Result<Vec<_>, _>>()?;
    let name = captures.name_ok("name")?;

    sequences.insert(&points, popularity.vote(name));

    Ok(())
}
