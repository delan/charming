use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;

pub(crate) fn range_handler(
    sink: &mut Vec<Option<String>>,
    captures: Captures,
) -> Result<(), Error> {
    let first = captures.name_ok("first")?;
    let last = captures.name_ok("last")?;

    let p = usize::from_str_radix(first, 16)?;
    let q = usize::from_str_radix(last, 16)? + 1;

    for i in p..q {
        sink[i] = Some(captures.name_ok("value")?.to_owned());
    }

    Ok(())
}
