use color_eyre::eyre::Result;
use regex::Captures;

use crate::details::Details;
use crate::range::range_handler;

pub(crate) fn gbp_handler(sink: &mut Vec<Details>, captures: Captures) -> Result<()> {
    range_handler(|r, x| r.gb = Some(x.parse().unwrap()), sink, captures)
}
