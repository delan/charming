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
        if let Some(old) = sink[point].nacorr.as_deref() {
            eprintln!("Warning: sink[{}].nacorr being overwritten from “{}” to “{}”", point, old, alias);
        }
        sink[point].nacorr = Some(popularity.vote(alias));
    }
    if r#type == "control" {
        if let Some(old) = sink[point].nacont.as_deref() {
            eprintln!("Warning: sink[{}].nacont being overwritten from “{}” to “{}”", point, old, alias);
        }
        sink[point].nacont = Some(popularity.vote(alias));
    }
    if r#type == "alternate" {
        if let Some(old) = sink[point].naalte.as_deref() {
            eprintln!("Warning: sink[{}].naalte being overwritten from “{}” to “{}”", point, old, alias);
        }
        sink[point].naalte = Some(popularity.vote(alias));
    }
    if r#type == "figment" {
        if let Some(old) = sink[point].nafigm.as_deref() {
            eprintln!("Warning: sink[{}].nafigm being overwritten from “{}” to “{}”", point, old, alias);
        }
        sink[point].nafigm = Some(popularity.vote(alias));
    }
    if r#type == "abbreviation" {
        if let Some(old) = sink[point].naabbr.as_deref() {
            eprintln!("Warning: sink[{}].naabbr being overwritten from “{}” to “{}”", point, old, alias);
        }
        sink[point].naabbr = Some(popularity.vote(alias));
    }

    Ok(())
}
