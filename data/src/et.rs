use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::{Details, Alias, AliasType};
use crate::pool::Popularity;
use crate::sequence::Sequences;

pub(crate) fn et_handler(
    popularity: &mut Popularity,
    sink: &mut Vec<Details>,
    sequences: &mut Sequences,
    captures: Captures,
) -> Result<(), Error> {
    let points = captures.name_ok("points")?
        .split(" ")
        .map(|x| usize::from_str_radix(x, 16))
        .collect::<Result<Vec<_>, _>>()?;
    let name = captures.name_ok("name")?;

    if points.len() > 1 {
        // eprintln!("{} {}", captures.name_ok("points")?, captures.name_ok("name")?);
        sequences.insert(&points, popularity.vote(name));
        return Ok(());
    }

    sink[points[0]].alias.push(Alias {
        inner: popularity.vote(name),
        r#type: AliasType::Cldr,
    });

    Ok(())
}
