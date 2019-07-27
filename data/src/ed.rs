use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::{Bits, Details};

pub(crate) fn ed_handler(sink: &mut Vec<Details>, captures: Captures) -> Result<(), Error> {
    let first = captures.name_ok("first")?;
    let last = captures.name_or("last", first);

    let p = usize::from_str_radix(first, 16)?;
    let q = usize::from_str_radix(last, 16)? + 1;

    for i in p..q {
        sink[i].bits |= Bits::IsEmojiPresentation as u8;
    }

    Ok(())
}
