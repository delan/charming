use failure::Error;
use regex::Captures;

use crate::details::Details;
use crate::pool::Popularity;
use crate::range::range_handler;

pub(crate) fn age_handler(
    popularity: &mut Popularity,
    sink: &mut Vec<Details>,
    captures: Captures,
) -> Result<(), Error> {
    range_handler(
        |r, x| r.age = Some(popularity.vote(&format!("Unicode {}", x))),
        sink,
        captures,
    )
}
