use failure::Error;
use regex::Captures;

use crate::captures::CapturesExt;
use crate::details::{Details, EmojiBits};

pub(crate) fn ed_handler(sink: &mut Vec<Details>, captures: Captures) -> Result<(), Error> {
    let first = captures.name_ok("first")?;
    let last = captures.name_or("last", first);
    let property = captures.name_ok("property")?;

    let p = usize::from_str_radix(first, 16)?;
    let q = usize::from_str_radix(last, 16)? + 1;

    for i in p..q {
        sink[i].ebits |= match property {
            "Emoji" => EmojiBits::IsEmoji,
            "Extended_Pictographic" => EmojiBits::IsExtendedPictographic,
            "Emoji_Component" => EmojiBits::IsEmojiComponent,
            "Emoji_Presentation" => EmojiBits::IsEmojiPresentation,
            "Emoji_Modifier" => EmojiBits::IsEmojiModifier,
            "Emoji_Modifier_Base" => EmojiBits::IsEmojiModifierBase,
            x => panic!("unexpected property: {}", x),
        } as u8;
    }

    Ok(())
}
