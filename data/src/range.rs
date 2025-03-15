use color_eyre::eyre;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::Details;

pub(crate) fn range_handler<S: FnMut(&mut Details, &str)>(
    mut setter: S,
    sink: &mut [Details],
    captures: Captures,
) -> eyre::Result<()> {
    let first = captures.try_name("first")?;
    let last = captures.name_or("last", first);

    let start = usize::from_str_radix(first, 16)?;
    let len = usize::from_str_radix(last, 16)? - start + 1;

    for item in sink.iter_mut().skip(start).take(len) {
        setter(item, captures.try_name("value")?);
    }

    Ok(())
}
