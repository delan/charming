use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::Details;

pub(crate) fn na_handler(sink: &mut Vec<Details>, captures: Captures) -> Result<(), Error> {
    let point = usize::from_str_radix(captures.name_ok("point")?, 16)?;
    let alias = captures.name_ok("alias")?;
    let r#type = captures.name_ok("type")?;

    if ["figment", "control", "correction"].contains(&r#type) {
        sink[point].name = Some(alias.to_owned());
    }

    Ok(())
}
