use failure::Error;
use regex::Captures;

use crate::details::Details;
use crate::range::range_handler;

pub(crate) fn block_handler(sink: &mut Vec<Details>, captures: Captures) -> Result<(), Error> {
    range_handler(|r, x| r.block = Some(x), sink, captures)
}
