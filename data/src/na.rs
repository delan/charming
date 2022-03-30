use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::{Details, Alias};
use crate::pool::Popularity;

pub(crate) fn na_handler(
    popularity: &mut Popularity,
    sink: &mut Vec<Details>,
    captures: Captures,
) -> Result<(), Error> {
    let point = usize::from_str_radix(captures.name_ok("point")?, 16)?;
    let alias = captures.name_ok("alias")?;
    let r#type = captures.name_ok("type")?;

    sink[point].alias.push(Alias {
        inner: popularity.vote(alias),
        r#type: r#type.parse()?,
    });

    Ok(())
}
