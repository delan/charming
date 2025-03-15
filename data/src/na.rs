use color_eyre::eyre::Result;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::{Alias, Details};
use crate::pool::Popularity;

pub(crate) fn na_handler(
    popularity: &mut Popularity,
    sink: &mut [Details],
    captures: Captures,
) -> Result<()> {
    let point = usize::from_str_radix(captures.try_name("point")?, 16)?;
    let alias = captures.try_name("alias")?;
    let r#type = captures.try_name("type")?;

    sink[point].alias.push(Alias {
        inner: popularity.vote(alias),
        r#type: r#type.parse()?,
    });

    Ok(())
}
