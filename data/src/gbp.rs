use failure::Error;
use regex::Captures;

use crate::details::Details;
use crate::range::range_handler;

pub(crate) fn gbp_handler(sink: &mut Vec<Details>, captures: Captures) -> Result<(), Error> {
    range_handler(|r, x| r.gb = Some(x.parse().unwrap()), sink, captures)
}
