use color_eyre::eyre;
use regex::Captures;

use crate::details::Details;
use crate::range::range_handler;

pub(crate) fn gbp_handler(sink: &mut [Details], captures: Captures) -> eyre::Result<()> {
    range_handler(|r, x| r.gb = Some(x.parse().unwrap()), sink, captures)
}
