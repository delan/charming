use std::collections::HashMap;

use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;

pub(crate) fn gc_handler(
    sink: &mut HashMap<String, String>,
    captures: Captures,
) -> Result<(), Error> {
    let key = captures.name_ok("key")?;
    let value = captures.name_ok("value")?;
    let value = value.replace('_', " ");
    let value = format!("{} ({})", value, key);

    sink.insert(key.to_owned(), value);

    Ok(())
}
