use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::Details;
use crate::pool::Popularity;

pub(crate) fn na_handler(
    popularity: &mut Popularity,
    sink: &mut Vec<Details>,
    captures: Captures,
) -> Result<(), Error> {
    let point = usize::from_str_radix(captures.name_ok("point")?, 16)?;
    let alias = captures.name_ok("alias")?;
    let r#type = captures.name_ok("type")?;

    if r#type == "correction" {
        sink[point].nacorr = Some(popularity.vote(alias));
    }
    if r#type == "control" {
        sink[point].nacont = Some(popularity.vote(alias));
    }
    if r#type == "alternate" {
        sink[point].naalte = Some(popularity.vote(alias));
    }
    if r#type == "figment" {
        sink[point].nafigm = Some(popularity.vote(alias));
    }
    if r#type == "abbreviation" {
        sink[point].naabbr = Some(popularity.vote(alias));
    }

    Ok(())
}
