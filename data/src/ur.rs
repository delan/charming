use color_eyre::eyre;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::{Bits, Details};
use crate::pool::Popularity;

pub(crate) fn ur_handler(
    popularity: &mut Popularity,
    sink: &mut [Details],
    captures: Captures,
) -> eyre::Result<()> {
    let point = usize::from_str_radix(captures.try_name("point")?, 16)?;
    let key = captures.try_name("key")?;
    let value = captures.try_name("value")?;

    match key {
        "kDefinition" => {
            assert!(sink[point].name.is_none());
            sink[point].uhdef = Some(popularity.vote(value));
            sink[point].bits |= Bits::KdefinitionExists;
        }
        "kMandarin" => {
            sink[point].uhman = Some(popularity.vote(value));
        }
        _ => {}
    }

    Ok(())
}
