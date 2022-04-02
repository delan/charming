use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::{Bits, Details};

pub(crate) fn ed_handler(sink: &mut Vec<Details>, captures: Captures) -> Result<(), Error> {
    let first = captures.name_ok("first")?;
    let last = captures.name_or("last", first);
    let property = captures.name_ok("property")?;

    let p = usize::from_str_radix(first, 16)?;
    let q = usize::from_str_radix(last, 16)? + 1;

    for i in p..q {
        sink[i].bits |= match property {
            "Emoji_Presentation" => Bits::IsEmojiPresentation,
            "Extended_Pictographic" => Bits::IsExtendedPictographic,
            x => panic!("unexpected property: {}", x),
        } as u8;
    }

    Ok(())
}
