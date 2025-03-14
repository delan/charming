use color_eyre::eyre::Result;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::pool::Popularity;
use crate::sequence::Sequences;

pub(crate) fn ns_handler(
    popularity: &mut Popularity,
    sequences: &mut Sequences,
    captures: Captures,
) -> Result<()> {
    let points = captures
        .try_name("points")?
        .split(" ")
        .map(|x| usize::from_str_radix(x, 16))
        .collect::<Result<Vec<_>, _>>()?;
    let name = captures.try_name("name")?;

    sequences.insert(&points, popularity.vote(name));

    Ok(())
}
