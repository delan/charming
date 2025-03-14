use std::collections::HashMap;

use color_eyre::eyre::Result;
use regex::Captures;

use crate::captures::CapturesExt;

pub(crate) fn gc_handler(sink: &mut HashMap<String, String>, captures: Captures) -> Result<()> {
    let key = captures.try_name("key")?;
    let value = captures.try_name("value")?;
    let value = value.replace('_', " ");
    let value = format!("{} ({})", value, key);

    sink.insert(key.to_owned(), value);

    Ok(())
}
