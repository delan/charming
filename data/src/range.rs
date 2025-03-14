use color_eyre::eyre::Result;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::Details;

pub(crate) fn range_handler<S: FnMut(&mut Details, &str)>(
    mut setter: S,
    sink: &mut Vec<Details>,
    captures: Captures,
) -> Result<()> {
    let first = captures.try_name("first")?;
    let last = captures.name_or("last", first);

    let p = usize::from_str_radix(first, 16)?;
    let q = usize::from_str_radix(last, 16)? + 1;

    for i in p..q {
        setter(&mut sink[i], captures.try_name("value")?);
    }

    Ok(())
}
