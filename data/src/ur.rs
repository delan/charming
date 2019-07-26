use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::{Bits, Details};

pub(crate) fn ur_handler(sink: &mut Vec<Details>, captures: Captures) -> Result<(), Error> {
    let point = usize::from_str_radix(captures.name_ok("point")?, 16)?;
    let key = captures.name_ok("key")?;
    let value = captures.name_ok("value")?;

    if key == "kMandarin" {
        sink[point].mpy = Some(value.to_owned());
    } else if key == "kDefinition" {
        sink[point].name = Some(value.to_owned());
        sink[point].bits |= Bits::KdefinitionExists as u8;
    }

    Ok(())
}
