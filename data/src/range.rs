use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::Details;

pub(crate) fn range_handler<S: FnMut(&mut Details, String)>(
    mut setter: S,
    sink: &mut Vec<Details>,
    captures: Captures,
) -> Result<(), Error> {
    let first = captures.name_ok("first")?;
    let last = captures.name_or("last", first);

    let p = usize::from_str_radix(first, 16)?;
    let q = usize::from_str_radix(last, 16)? + 1;

    for i in p..q {
        setter(&mut sink[i], captures.name_ok("value")?.to_owned());
    }

    Ok(())
}
