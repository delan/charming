use std::collections::HashMap;

use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;

pub(crate) fn gc_handler(
    sink: &mut HashMap<String, String>,
    captures: Captures,
) -> Result<(), Error> {
    let key = captures.name_ok("key")?.to_owned();
    let value = captures.name_ok("value")?.to_owned();
    let value = format!("{} ({})", value, key);

    sink.insert(key, value);

    Ok(())
}
