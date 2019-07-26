use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;

pub(crate) fn na_handler(
    sink: &mut Vec<Option<(u8, String, String)>>,
    captures: Captures,
) -> Result<(), Error> {
    let point = usize::from_str_radix(captures.name_ok("point")?, 16)?;
    let alias = captures.name_ok("alias")?;
    let r#type = captures.name_ok("type")?;

    if ["figment", "control", "correction"].contains(&r#type) {
        let (bits, _, gc) = sink[point].take().unwrap();
        sink[point] = Some((bits, alias.to_owned(), gc));
    }

    Ok(())
}
